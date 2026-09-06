#!/usr/bin/env python3
"""Generate a per-bot AIRC onboarding brief from the template.
usage: make-brief.py <handle> "<operator name>" <first_peer> <runtime> [--with-operator] [--out <path>]
TEMPLATE.md is the ONE brief; every per-bot brief (and docs/GROKBOT-ONBOARDING-BRIEF.md) is generated from it."""
import json,sys,os
here=os.path.dirname(__file__)
args=[a for a in sys.argv[1:] if not a.startswith('--')]
handle,op,peer,rt=args[:4]
with_op='--with-operator' in sys.argv
out_path=sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else None
t=open(os.path.join(here,'TEMPLATE.md')).read()
r=json.load(open(os.path.join(here,'runtimes.json')))
if rt not in r: sys.exit(f"runtime must be one of {list(r)}")
out=t.replace('{{handle}}',handle).replace('{{operator_name}}',op).replace('{{first_peer}}',peer).replace('{{RUNTIME_WATCH}}',r[rt])
out=out.split('\n---\n*Generate')[0]
if with_op: out=out.rstrip()+'\n\n---\n\n'+open(os.path.join(here,'OPERATOR-CHECKLIST.md')).read()
path=out_path or os.path.join(here,f'{handle}-brief.md'); open(path,'w').write(out); print(path)
