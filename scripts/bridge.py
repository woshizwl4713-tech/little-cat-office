#!/usr/bin/env python3
"""Local JSON event bridge. IDs are stable; names are display labels only."""
import argparse
import json
import sys
import catctl


def forward(event, url=None):
    if not isinstance(event, dict) or not isinstance(event.get('to'), list):
        raise ValueError('event must be an object with a to array')
    kind = event.get('type')
    if kind not in ('assign', 'summon', 'chat', 'group'):
        raise ValueError('type must be assign, summon, chat or group')
    actors = [event.get('from')] + event.get('to', [])
    if len(actors) < 2 or any(not isinstance(a, dict) or not isinstance(a.get('id'), str) or not a['id'].strip() for a in actors):
        raise ValueError('from and to require objects with stable id and optional name')
    if len({a['id'] for a in actors}) != len(actors):
        raise ValueError('participants must have distinct IDs')
    if not isinstance(event.get('id'), str) or not event['id'].strip() or not isinstance(event.get('task'), str) or not event['task'].strip():
        raise ValueError('id and task are required strings')
    if any('name' in a and (not isinstance(a['name'], str) or not a['name'].strip()) for a in actors):
        raise ValueError('name must be a nonempty string')
    state = catctl.request(url=url)
    existing = {a['id']: a for a in state['agents']}
    leader = next((a['id'] for a in state['agents'] if a.get('role') == 'lead'), actors[0]['id'])
    # Preserve live status while registering display names; never edit roster files.
    for actor in actors:
        old = existing.get(actor['id'])
        if old is None or ('name' in actor and actor['name'] != old.get('name')):
            catctl.report(old.get('state', 'idle') if old else 'idle', old.get('task', '') if old else '', actor['id'], actor.get('name', actor['id']), url=url)
    sender = actors[0]['id'] if kind == 'assign' else leader
    recipients = [a['id'] for a in actors if a['id'] != sender]
    return catctl.request({'from': sender, 'to': recipients, 'task': event['task'], 'id': event['id']}, url=url, path='/api/assign')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', nargs='?', help='JSON event file; omit for one JSON event per stdin line')
    args = parser.parse_args()
    try:
        if args.file:
            with open(args.file, encoding='utf-8') as source:
                print(json.dumps(forward(json.load(source)), ensure_ascii=False))
        else:
            for line in sys.stdin:
                if line.strip():
                    print(json.dumps(forward(json.loads(line)), ensure_ascii=False), flush=True)
    except (ValueError, OSError, TypeError, KeyError) as error:
        print('Bridge failed: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
