"""Set Stride App Store metadata + screenshots via ASC API. Idempotent. Run from landed/.credentials with PYTHONPATH=."""
import asc, json, os, glob, time
APP='6808848925'
SUBS=tuple(x for x in open('/Users/raymondzhao/workspace/stride_subs.log').read().split() if x.isdigit() and len(x)==10)
SHOTS=sorted(glob.glob('/Users/raymondzhao/workspace/stride/store/screenshots/0*.png'))
DESC="""A step counter that never talks about your weight. Stride counts your steps, gives you one gentle goal, and shows you a trail of small days that add up. No calories, no leaderboard, no shame.

ONE NUMBER, ONE SOFT GOAL
Open the app and see today's steps in a ring, how many are left, and a short note that isn't about your body. That's the whole home screen.

A GOAL THAT ADAPTS TO YOU
Let Stride pick a target from how you already move, then nudge it up or down as your weeks change. You can accept the suggestion or keep what you have.

A TRAIL, NOT A LEADERBOARD
Your last 30 or 90 days as a quiet trail of dots. Watch your average drift upward without comparing yourself to anyone.

STREAKS PAUSE, THEY NEVER BREAK
Miss a day and your run is paused, not erased. Come back whenever you're ready.

LOG A WALK
Add a walk by hand when you left the phone at home. Big days get noticed automatically.

PRIVATE BY DESIGN
Steps come from your iPhone's motion sensor and stay on your phone. No account, no sign-in, no server. Weight tracking is optional and hidden by default.

STRIDE PRO
Today's steps and the ring are free. The trail, adaptive goals, walk log, badges and reminders are part of a Stride Pro subscription (monthly or yearly), each with a 7-day free trial. Payment is charged to your Apple ID account at confirmation of purchase after the trial. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID settings.

Terms of Use (EULA): https://tryforma.app/stride/terms.html
Privacy Policy: https://tryforma.app/stride/privacy.html

Stride is a wellbeing companion, not medical advice. If you have a health condition, talk to a professional before changing your activity."""
KEYWORDS="step counter,pedometer,walking,steps,daily steps,walk tracker,step tracker,gentle,habit,ozempic,glp-1"
PROMO="Count steps, not calories. One gentle goal, a trail of small days, and streaks that pause instead of breaking. 7-day free trial."
WHATS_NEW="Meet your Wisp. Track your clean streak, surf cravings in 3 minutes, taper at your pace, and watch your body bounce back."
def ok(r,what):
    if 'data' in r: return r['data']
    print('FAIL',what,json.dumps(r)[:600]); return None
v=asc.api('GET',f'/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=1&fields[appStoreVersions]=versionString,appStoreState')['data'][0]
VID=v['id']; print('version', v['attributes'])
# version localization
locs=asc.api('GET',f'/v1/appStoreVersions/{VID}/appStoreVersionLocalizations')['data']
en=next((l for l in locs if l['attributes']['locale']=='en-US'),None)
attrs={'description':DESC,'keywords':KEYWORDS[:100],'promotionalText':PROMO[:170],'supportUrl':'https://tryforma.app/stride/privacy.html','marketingUrl':'https://tryforma.app/stride/'}
if en: r=asc.api('PATCH',f"/v1/appStoreVersionLocalizations/{en['id']}",{'data':{'type':'appStoreVersionLocalizations','id':en['id'],'attributes':attrs}})
else: r=asc.api('POST','/v1/appStoreVersionLocalizations',{'data':{'type':'appStoreVersionLocalizations','attributes':dict(attrs,locale='en-US'),'relationships':{'appStoreVersion':{'data':{'type':'appStoreVersions','id':VID}}}}})
en=ok(r,'version loc'); print('version localization ok', en['id'] if en else '')
# app info: subtitle, privacy url, categories
infos=asc.api('GET',f'/v1/apps/{APP}/appInfos')['data']
for info in infos:
    il=asc.api('GET',f"/v1/appInfos/{info['id']}/appInfoLocalizations")['data']
    l=next((x for x in il if x['attributes']['locale']=='en-US'),None)
    a={'subtitle':'Gentle Step Counter, No Shame','privacyPolicyUrl':'https://tryforma.app/stride/privacy.html'}
    if l: r=asc.api('PATCH',f"/v1/appInfoLocalizations/{l['id']}",{'data':{'type':'appInfoLocalizations','id':l['id'],'attributes':a}})
    else: r=asc.api('POST','/v1/appInfoLocalizations',{'data':{'type':'appInfoLocalizations','attributes':dict(a,locale='en-US'),'relationships':{'appInfo':{'data':{'type':'appInfos','id':info['id']}}}}})
    print('appInfo loc', 'ok' if 'data' in r else json.dumps(r)[:300])
    r=asc.api('PATCH',f"/v1/appInfos/{info['id']}",{'data':{'type':'appInfos','id':info['id'],'relationships':{'primaryCategory':{'data':{'type':'appCategories','id':'HEALTH_AND_FITNESS'}},'secondaryCategory':{'data':{'type':'appCategories','id':'LIFESTYLE'}}}}})
    print('categories', 'ok' if 'data' in r else json.dumps(r)[:300])
# content rights + version attrs
r=asc.api('PATCH',f'/v1/apps/{APP}',{'data':{'type':'apps','id':APP,'attributes':{'contentRightsDeclaration':'DOES_NOT_USE_THIRD_PARTY_CONTENT'}}}); print('content rights', 'ok' if 'data' in r else json.dumps(r)[:200])
r=asc.api('PATCH',f'/v1/appStoreVersions/{VID}',{'data':{'type':'appStoreVersions','id':VID,'attributes':{'copyright':'2026 RZ International LLC','releaseType':'AFTER_APPROVAL'}}}); print('version attrs', 'ok' if 'data' in r else json.dumps(r)[:200])
# review details
rd=asc.api('GET',f'/v1/appStoreVersions/{VID}/appStoreReviewDetail')
ra={'contactFirstName':'Ruihao','contactLastName':'Zhao','contactPhone':'+14155550100','contactEmail':'ray@thezenithlabs.com','demoAccountRequired':False,'notes':'Stride is a fully local step counter. No account or sign-in. Onboarding asks about motivation, lets the user pick or auto-pick a step goal, and requests Motion & Fitness permission (steps come from CMPedometer via expo-sensors). Then the paywall (monthly or yearly with a 7-day free trial); tap Continue with the basics to use the free tier (today\'s steps + ring). Pro unlocks the Trail, adaptive goals, walk log, badges and reminders. On Simulator the pedometer returns 0; use a physical device or the in-app Log a walk button to add steps. Not medical advice.'}
if rd.get('data'): r=asc.api('PATCH',f"/v1/appStoreReviewDetails/{rd['data']['id']}",{'data':{'type':'appStoreReviewDetails','id':rd['data']['id'],'attributes':ra}})
else: r=asc.api('POST','/v1/appStoreReviewDetails',{'data':{'type':'appStoreReviewDetails','attributes':ra,'relationships':{'appStoreVersion':{'data':{'type':'appStoreVersions','id':VID}}}}})
print('review detail', 'ok' if 'data' in r else json.dumps(r)[:300])
# screenshots 6.7"
if en and SHOTS:
    sets=asc.api('GET',f"/v1/appStoreVersionLocalizations/{en['id']}/appScreenshotSets?fields[appScreenshotSets]=screenshotDisplayType")['data']
    st=next((s for s in sets if s['attributes']['screenshotDisplayType']=='APP_IPHONE_67'),None)
    if not st: st=ok(asc.api('POST','/v1/appScreenshotSets',{'data':{'type':'appScreenshotSets','attributes':{'screenshotDisplayType':'APP_IPHONE_67'},'relationships':{'appStoreVersionLocalization':{'data':{'type':'appStoreVersionLocalizations','id':en['id']}}}}}),'set')
    have=[x['attributes']['fileName'] for x in asc.api('GET',f"/v1/appScreenshotSets/{st['id']}/appScreenshots?fields[appScreenshots]=fileName")['data']]
    for f in SHOTS:
        if os.path.basename(f) in have: continue
        r=asc.upload_asset('/v1/appScreenshots',{'data':{'type':'appScreenshots','attributes':{'fileName':os.path.basename(f)},'relationships':{'appScreenshotSet':{'data':{'type':'appScreenshotSets','id':st['id']}}}}},f,'appScreenshots')
        print('  shot', os.path.basename(f), 'ok' if 'data' in r else json.dumps(r)[:200])
# subscription review screenshots (helps clear MISSING_METADATA)
for sid in SUBS:
    cur=asc.api('GET',f'/v1/subscriptions/{sid}/appStoreReviewScreenshot')
    if cur.get('data'): print('sub', sid, 'review shot exists'); continue
    if not SHOTS: print('no screenshots yet for sub review'); continue
    r=asc.upload_asset('/v1/subscriptionAppStoreReviewScreenshots',{'data':{'type':'subscriptionAppStoreReviewScreenshots','attributes':{'fileName':'01_home.png'},'relationships':{'subscription':{'data':{'type':'subscriptions','id':sid}}}}},SHOTS[0],'subscriptionAppStoreReviewScreenshots')
    print('sub', sid, 'review shot', 'ok' if 'data' in r else json.dumps(r)[:300])
time.sleep(3)
for sid in SUBS:
    print('sub state', asc.api('GET',f'/v1/subscriptions/{sid}?fields[subscriptions]=name,state')['data']['attributes'])
print('DONE')
