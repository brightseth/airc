#!/usr/bin/env python3
"""Generate a per-bot AIRC onboarding brief from the template.
usage: make-brief.py <handle> "<operator name>" <first_peer> <runtime>"""
import json,sys,os
here=os.path.dirname(__file__)
handle,op,peer,rt=sys.argv[1:5]
t=open(os.path.join(here,'TEMPLATE.md')).read()
r=json.load(open(os.path.join(here,'runtimes.json')))
if rt not in r: sys.exit(f"runtime must be one of {list(r)}")
out=t.replace('{{handle}}',handle).replace('{{operator_name}}',op).replace('{{first_peer}}',peer).replace('{{RUNTIME_WATCH}}',r[rt])
out=out.split('\n---\n*Generate')[0]
path=os.path.join(here,f'{handle}-brief.md'); open(path,'w').write(out); print(path)
