"""Canonical status validation and expiry. Standard library only."""
from datetime import datetime, timezone
import threading, sqlite3, json, hashlib, uuid
from pathlib import Path
from contextlib import contextmanager, closing

STATES = {'working', 'meeting', 'idle', 'need_you', 'offline'}
def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('updatedAt must be an ISO-8601 timestamp')
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            raise ValueError()
        return dt.timestamp()
    except (ValueError, OverflowError):
        raise ValueError('updatedAt must include a valid timezone') from None

def normalize(payload, now):
    items = payload.get('agents') if isinstance(payload, dict) and 'agents' in payload else payload
    if isinstance(items, dict): items = [items]
    if not isinstance(items, list) or not items or len(items) > 500:
        raise ValueError('Supply one agent, an array, or {agents: [...]} (1..500 agents)')
    result, seen = [], set()
    for item in items:
        if not isinstance(item, dict): raise ValueError('Agent must be an object')
        ident = item.get('id')
        if not isinstance(ident, str) or not ident.strip() or len(ident) > 100 or ident in seen:
            raise ValueError('Unique nonempty id of at most 100 characters required')
        seen.add(ident)
        record = {'id': ident, 'name': item.get('name', ident), 'task': item.get('task', ''),
                  'avatar': item.get('avatar', 'cat-grey'), 'role':item.get('role','employee')}
        for field, limit in [('name',100), ('task',4000), ('avatar',100)]:
            if not isinstance(record[field], str) or len(record[field]) > limit:
                raise ValueError(f'Invalid {field}')
        if record['role'] not in ('employee','lead'):raise ValueError('role must be employee or lead')
        state = item.get('state', item.get('status', 'idle'))
        if not isinstance(state, str): raise ValueError('state must be a string')
        state = {'thinking':'working', 'error':'need_you'}.get(state, state)
        record['state'] = state if state in STATES else 'idle'
        record['updatedAt'] = item.get('updatedAt', datetime.fromtimestamp(now, timezone.utc).isoformat())
        if timestamp(record['updatedAt']) > now + 60: raise ValueError('Timestamp is more than 60 seconds in the future')
        result.append(record)
    return result

class Store:
    def __init__(self, timeout=300, clock=None, stale_becomes="idle", path=None, auto_lead=False):
        import time
        self.clock = clock or time.time
        self.timeout = timeout
        if stale_becomes not in {"idle", "offline"}: raise ValueError("staleBecomes must be idle or offline")
        self.stale_becomes = stale_becomes
        self.records = {}
        self.lock = threading.Lock()
        self.changed = threading.Condition(self.lock)
        self.path = Path(path) if path else None
        self.overrides = {}
        self.assignments=[]
        self.auto_lead=auto_lead
        if self.path:
            self.path.parent.mkdir(parents=True,exist_ok=True)
            with closing(sqlite3.connect(self.path)) as db:
                db.execute('CREATE TABLE IF NOT EXISTS office (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)')
                row=db.execute('SELECT payload FROM office WHERE id=1').fetchone()
            if row:
                saved=json.loads(row[0])
                loaded=normalize(saved['agents'],self.clock()) if saved['agents'] else []
                self.records={r['id']:r for r in loaded}
                self.overrides=saved.get('overrides',{});self.assignments=saved.get('assignments',[])
    @contextmanager
    def transaction(self):
        with self.lock:
            db=sqlite3.connect(self.path) if self.path else None
            try:
                if db:
                    db.execute('BEGIN IMMEDIATE')
                    row=db.execute('SELECT payload FROM office WHERE id=1').fetchone()
                    if row:
                        saved=json.loads(row[0]);self.records={r['id']:r for r in saved['agents']};self.overrides=saved.get('overrides',{});self.assignments=saved.get('assignments',[])
                previous=(self.records,self.overrides,self.assignments)
                self.active_db=db
                try:
                    yield
                    if db:db.commit()
                except Exception:
                    self.records,self.overrides,self.assignments=previous
                    if db:db.rollback()
                    raise
            finally:
                self.active_db=None
                if db:db.close()
    def persist(self, records, overrides, assignments=None):
        if self.path:
            self.active_db.execute('INSERT OR REPLACE INTO office(id,payload) VALUES(1,?)',(json.dumps({'agents':list(records.values()),'overrides':overrides,'assignments':self.assignments if assignments is None else assignments},ensure_ascii=False),))
    def push(self, payload):
        records = normalize(payload, self.clock())
        with self.transaction():
            if len(set(self.records) | {r['id'] for r in records}) > 500:
                raise ValueError('Maximum 500 agents')
            original=payload.get('agents') if isinstance(payload,dict) and 'agents' in payload else payload
            if isinstance(original,dict): original=[original]
            source={r['id']:r for r in original}
            next_records={k:dict(v) for k,v in self.records.items()}
            for r in records:
                old = self.records.get(r['id'])
                if old and timestamp(r['updatedAt']) < timestamp(old['updatedAt']): continue
                if 'role' not in source[r['id']] and old:r['role']=old.get('role','employee')
                if 'name' not in source[r['id']] and old:r['name']=old['name']
                if 'avatar' not in source[r['id']]:
                    r['avatar']=old['avatar'] if old else ['cat-grey','cat-white','cat-calico','cat-black','cat-orange'][int(hashlib.sha256(r['id'].encode()).hexdigest(),16)%5]
                if old and old.get('leadSource'):r['leadSource']=old['leadSource']
                if source[r['id']].get('isPrimary') is True and 'role' not in source[r['id']]:r['role']='lead'
                if source[r['id']].get('role')=='lead' or source[r['id']].get('isPrimary') is True:r['leadSource']='declared'
                r.update(self.overrides.get(r['id'],{}))
                next_records[r['id']]=r
            declared=[r for r in records if next_records.get(r['id'],{}).get('role')=='lead' and (source[r['id']].get('role')=='lead' or source[r['id']].get('isPrimary') is True)]
            if declared:
                for ident,old in list(next_records.items()):
                    if old.get('leadSource') in ('auto','dispatch') and self.overrides.get(ident,{}).get('role')!='lead' and ident not in {r['id'] for r in declared}:next_records[ident]={**old,'role':'employee','leadSource':'replaced'}
            if self.auto_lead and not self.records and not any(r.get('role')=='lead' for r in next_records.values()):
                candidate=next((r for r in records if 'role' not in source[r['id']]),None)
                if candidate:next_records[candidate['id']].update(role='lead',leadSource='auto')
            if sum(r.get('role')=='lead' for r in next_records.values())>1:raise ValueError('Only one leader allowed')
            pending=list(self.assignments)
            for ident,raw in source.items():
                if raw.get('assignmentId'):
                    event=self.make_assignment(next_records,pending,{'id':raw['assignmentId'],'leaderId':raw.get('assignedBy'),'agentId':ident,'task':raw.get('task','')})
                    if event:pending.append(event)
            self.assignments=[{**e,'status':'cancelled'} if e['status']=='pending' and next_records.get(e['leaderId'],{}).get('role')!='lead' else e for e in pending[-1000:]]
            self.persist(next_records,self.overrides)
            self.records=next_records
            self.changed.notify_all()
        return self.snapshot()
    def snapshot(self):
        now = self.clock()
        with self.lock:
            if self.path:
                with closing(sqlite3.connect(self.path)) as db:row=db.execute('SELECT payload FROM office WHERE id=1').fetchone()
                if row:
                    saved=json.loads(row[0]);self.records={r['id']:r for r in saved['agents']};self.overrides=saved.get('overrides',{});self.assignments=saved.get('assignments',[])
            records = [dict(r) for r in self.records.values()]
            assignments=[dict(e) for e in self.assignments]
        for r in records:
            if now - timestamp(r['updatedAt']) > self.timeout and r['state'] != 'offline':
                r['state'] = self.stale_becomes
                r['stale'] = True
        return {'agents': records, 'assignments':assignments, 'roster':[{'id':r['id'],'name':r['name'],'avatar':r['avatar'],'role':r.get('role','employee')} for r in records], 'activity': []}

    def wait(self, timeout=1):
        with self.changed:
            self.changed.wait(timeout)

    def edit(self, payload):
        if not isinstance(payload,dict) or not isinstance(payload.get('id'),str): raise ValueError('id required')
        ident=payload['id'];action=payload.get('action','update')
        if action not in {'update','delete'}: raise ValueError('Invalid action')
        with self.transaction():
            if ident not in self.records: raise ValueError('Unknown agent')
            records={k:dict(v) for k,v in self.records.items()};overrides={k:dict(v) for k,v in self.overrides.items()}
            if action=='delete':records.pop(ident);overrides.pop(ident,None)
            else:
                fields={k:payload[k] for k in ('name','avatar','role') if k in payload}
                if not fields or any(not isinstance(v,str) or not v.strip() or len(v)>100 for v in fields.values()):raise ValueError('Invalid name or avatar')
                if 'avatar' in fields and fields['avatar'] not in {'cat-grey','cat-white','cat-calico','cat-black','cat-orange'}:raise ValueError('Unknown avatar')
                if 'role' in fields and fields['role'] not in ('employee','lead'):raise ValueError('Invalid role')
                records[ident].update(fields);
                if fields.get('role')=='lead':
                    for other_id,r in records.items():
                        if other_id!=ident and r.get('role')=='lead' and r.get('leadSource') in ('auto','dispatch') and overrides.get(other_id,{}).get('role')!='lead':r.update(role='employee',leadSource='replaced')
                if 'role' in fields:records[ident]['leadSource']='manual'
                overrides.setdefault(ident,{}).update(fields)
            if sum(r.get('role')=='lead' for r in records.values())>1:raise ValueError('Only one leader allowed')
            self.assignments=[{**e,'status':'cancelled'} if e['status']=='pending' and (e['agentId'] not in records or records.get(e['leaderId'],{}).get('role')!='lead') else e for e in self.assignments]
            self.persist(records,overrides);self.records=records;self.overrides=overrides;self.changed.notify_all()
        return self.snapshot()

    def make_assignment(self, records, events, payload):
        leader=payload.get('leaderId') or next((r['id'] for r in records.values() if r.get('role')=='lead'),None)
        target=payload.get('agentId');task=payload.get('task');ident=payload.get('id') or str(uuid.uuid4())
        if not isinstance(ident,str) or not ident.strip() or len(ident)>100:raise ValueError('Invalid assignment id')
        if not isinstance(target,str) or not target.strip() or len(target)>100 or target==leader:raise ValueError('Invalid assignee')
        if not isinstance(task,str) or not task.strip() or len(task)>4000:raise ValueError('Task required')
        if records.get(leader,{}).get('role')!='lead':raise ValueError('Primary bot must report first')
        previous=next((e for e in events if e['id']==ident),None)
        if previous:
            if (previous['leaderId'],previous['agentId'],previous['task'])!=(leader,target,task):raise ValueError('Assignment id reused with different content')
            return None
        if sum(e['status']=='pending' for e in events)>=200:raise ValueError('Assignment queue full')
        return {'id':ident,'leaderId':leader,'agentId':target,'task':task,'status':'pending','createdAt':datetime.fromtimestamp(self.clock(),timezone.utc).isoformat()}

    def assign(self, payload):
        if not isinstance(payload,dict):raise ValueError('Assignment object required')
        with self.transaction():
            events=[dict(e) for e in self.assignments];records={k:dict(v) for k,v in self.records.items()}
            if payload.get('action')=='complete':
                ids=payload.get('ids',[payload.get('id')])
                if not isinstance(ids,list) or not ids or len(ids)>50:raise ValueError('Invalid completion list')
                for ident in ids:
                    event=next((e for e in events if e['id']==ident),None)
                    if not event:raise ValueError('Unknown assignment')
                    if event['status']=='pending':
                        event['status']='completed'
                        if event['agentId'] in records:
                            records[event['agentId']]={**records[event['agentId']],'state':'working','task':event['task'],'updatedAt':datetime.fromtimestamp(self.clock(),timezone.utc).isoformat()}
            else:
                event=self.make_assignment(records,events,payload)
                if event:
                    ident=event['agentId'];old=records.get(ident)
                    if not old and len(records)>=500:raise ValueError('Maximum 500 agents')
                    record=normalize({'id':ident,'name':old['name'] if old else ident,'avatar':old['avatar'] if old else 'cat-grey','role':'employee','state':'working','task':event['task']},self.clock())[0]
                    record.update(self.overrides.get(ident,{}));records[ident]=record;events.append(event)
            events=events[-1000:];self.persist(records,self.overrides,events);self.records=records;self.assignments=events;self.changed.notify_all()
        return self.snapshot()

    def dispatch(self, payload):
        if not isinstance(payload,dict):raise ValueError('Dispatch object required')
        sender=payload.get('from');targets=payload.get('to');task=payload.get('task');batch=payload.get('id') or str(uuid.uuid4())
        if not isinstance(sender,str) or not sender.strip() or len(sender)>100:raise ValueError('Invalid sender')
        if not isinstance(targets,list) or not 1<=len(targets)<=50 or any(not isinstance(x,str) or not x.strip() or len(x)>100 for x in targets) or len(set(targets))!=len(targets) or sender in targets:raise ValueError('Invalid recipients')
        if not isinstance(batch,str) or not batch.strip() or len(batch)>80:raise ValueError('Invalid dispatch id')
        if not isinstance(task,str) or not task.strip() or len(task)>4000:raise ValueError('Task required')
        with self.transaction():
            records={k:dict(v) for k,v in self.records.items()};events=[dict(e) for e in self.assignments];overrides={k:dict(v) for k,v in self.overrides.items()}
            existing=[e for e in events if e.get('dispatchId')==batch]
            if existing:
                if existing[0].get('from')!=sender or [e['agentId'] for e in existing]!=targets or existing[0]['task']!=task:raise ValueError('Dispatch id reused with different content')
            else:
                if len(set(records)|{sender}|set(targets))>500:raise ValueError('Maximum 500 agents')
                for ident in [sender]+targets:
                    if ident not in records:records[ident]=normalize({'id':ident,'state':'idle','avatar':['cat-grey','cat-white','cat-calico','cat-black','cat-orange'][int(hashlib.sha256(ident.encode()).hexdigest(),16)%5]},self.clock())[0]
                explicit=next((r for r in records.values() if r.get('role')=='lead' and (r.get('leadSource') in ('manual','declared') or overrides.get(r['id'],{}).get('role')=='lead')),None)
                leader=explicit['id'] if explicit else sender
                if leader in targets:raise ValueError('Cannot assign a task to the leader')
                if not explicit:
                    for ident,r in records.items():
                        if r.get('role')=='lead' and ident!=sender:r.update(role='employee',leadSource='replaced')
                    records[sender].update(role='lead',leadSource='dispatch')
                    if overrides.get(sender,{}).get('role')=='employee':overrides[sender].pop('role')
                events=[{**e,'status':'cancelled'} if e['status']=='pending' and records.get(e['leaderId'],{}).get('role')!='lead' else e for e in events]
                for i,ident in enumerate(targets):
                    event=self.make_assignment(records,events,{'id':batch+':'+str(i),'leaderId':leader,'agentId':ident,'task':task})
                    event.update(dispatchId=batch,groupId=batch+':group:'+str(i//3),**{'from':sender});events.append(event)
                    records[ident].update(state='meeting',task=task,updatedAt=datetime.fromtimestamp(self.clock(),timezone.utc).isoformat())
                records[sender]['state']='working'
                records[sender]['updatedAt']=datetime.fromtimestamp(self.clock(),timezone.utc).isoformat()
                self.persist(records,overrides,events[-1000:]);self.records=records;self.overrides=overrides;self.assignments=events[-1000:];self.changed.notify_all()
        return self.snapshot()
