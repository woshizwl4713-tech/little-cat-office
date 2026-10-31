"""Canonical status validation and expiry. Standard library only."""
from datetime import datetime, timezone
import threading

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
                  'avatar': item.get('avatar', 'cat-grey')}
        for field, limit in [('name',100), ('task',4000), ('avatar',100)]:
            if not isinstance(record[field], str) or len(record[field]) > limit:
                raise ValueError(f'Invalid {field}')
        state = item.get('state', item.get('status', 'idle'))
        if not isinstance(state, str): raise ValueError('state must be a string')
        state = {'thinking':'working', 'error':'need_you'}.get(state, state)
        record['state'] = state if state in STATES else 'idle'
        record['updatedAt'] = item.get('updatedAt', datetime.fromtimestamp(now, timezone.utc).isoformat())
        if timestamp(record['updatedAt']) > now + 60: raise ValueError('Timestamp is more than 60 seconds in the future')
        result.append(record)
    return result

class Store:
    def __init__(self, timeout=300, clock=None):
        import time
        self.clock = clock or time.time
        self.timeout = timeout
        self.records = {}
        self.lock = threading.Lock()
    def push(self, payload):
        records = normalize(payload, self.clock())
        with self.lock:
            if len(set(self.records) | {r['id'] for r in records}) > 500:
                raise ValueError('Maximum 500 agents')
            for r in records:
                old = self.records.get(r['id'])
                if not old or timestamp(r['updatedAt']) >= timestamp(old['updatedAt']):
                    self.records[r['id']] = r
        return self.snapshot()
    def snapshot(self):
        now = self.clock()
        with self.lock:
            records = [dict(r) for r in self.records.values()]
        for r in records:
            if now - timestamp(r['updatedAt']) > self.timeout: r['state'] = 'offline'
        return {'agents': records, 'activity': []}
