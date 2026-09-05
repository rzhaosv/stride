"""Attach newest processed build to Lantern 1.0, create a review submission with version + subs + group version, submit.
Run: cd landed/.credentials && PYTHONPATH=. python3 ~/workspace/wisp/store/asc_submit.py [--dry-run]"""
import asc, json, sys, time
APP='6808848925'; GROUP='22360379'; SUBS=['6808848932','6808849629']; DRY='--dry-run' in sys.argv
def err(r): return [ (e.get('code'), e.get('detail')) for e in r.get('body',{}).get('errors',[])] or r
v=asc.api('GET',f'/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=1&fields[appStoreVersions]=versionString,appStoreState')['data'][0]; VID=v['id']
print('version', v['attributes'])
b=asc.api('GET',f'/v1/builds?filter[app]={APP}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,uploadedDate')['data']
print('builds:', [(x['attributes']['version'], x['attributes']['processingState']) for x in b])
valid=[x for x in b if x['attributes']['processingState']=='VALID']
if not valid: print('no VALID build yet'); sys.exit(2)
if DRY: sys.exit(0)
r=asc.api('PATCH',f'/v1/appStoreVersions/{VID}',{'data':{'type':'appStoreVersions','id':VID,'relationships':{'build':{'data':{'type':'builds','id':valid[0]['id']}}}}})
print('attach build', valid[0]['attributes']['version'], 'ok' if 'data' in r else err(r))
# export compliance flag on build (ITSAppUsesNonExemptEncryption false is in plist; set anyway)
asc.api('PATCH',f"/v1/builds/{valid[0]['id']}",{'data':{'type':'builds','id':valid[0]['id'],'attributes':{'usesNonExemptEncryption':False}}})
# review submission
rs=asc.api('GET',f'/v1/apps/{APP}/reviewSubmissions?filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES&limit=1')
sub=rs['data'][0] if rs.get('data') else None
if not sub:
    r=asc.api('POST','/v1/reviewSubmissions',{'data':{'type':'reviewSubmissions','attributes':{'platform':'IOS'},'relationships':{'app':{'data':{'type':'apps','id':APP}}}}})
    sub=r.get('data'); print('review submission', sub['id'] if sub else err(r))
    if not sub: sys.exit(1)
RID=sub['id']
def add(rel, typ, id_):
    r=asc.api('POST','/v1/reviewSubmissionItems',{'data':{'type':'reviewSubmissionItems','relationships':{'reviewSubmission':{'data':{'type':'reviewSubmissions','id':RID}},rel:{'data':{'type':typ,'id':id_}}}}})
    print(' item', rel, id_, 'ok' if 'data' in r else err(r))
add('appStoreVersion','appStoreVersions',VID)
for s in SUBS: add('subscription','subscriptions',s)
gv=asc.api('GET',f'/v1/subscriptionGroups/{GROUP}/versions?fields[subscriptionGroupVersions]=state')['data']
print('group versions', [(g['id'][:8], g['attributes']) for g in gv])
for g in gv:
    if g['attributes'].get('state') in ('PREPARE_FOR_SUBMISSION','READY_TO_SUBMIT'): add('subscriptionGroupVersion','subscriptionGroupVersions',g['id'])
items=asc.api('GET',f'/v1/reviewSubmissions/{RID}/items')['data']; print('items now:', [i['attributes']['state'] for i in items])
for attempt in range(6):
    r=asc.api('PATCH',f'/v1/reviewSubmissions/{RID}',{'data':{'type':'reviewSubmissions','id':RID,'attributes':{'submitted':True}}})
    if 'data' in r: print('SUBMITTED:', r['data']['attributes']); break
    print('submit attempt', attempt+1, json.dumps(err(r))[:400]); time.sleep(20)
print('final:', asc.api('GET',f'/v1/reviewSubmissions/{RID}')['data']['attributes'])
