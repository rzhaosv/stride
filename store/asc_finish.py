import asc, json
APP='6808848925'
for i in asc.api('GET',f'/v1/apps/{APP}/appInfos')['data']:
    ID=asc.api('GET',f"/v1/appInfos/{i['id']}/ageRatingDeclaration")['data']['id']
    attrs={'advertising':False,'alcoholTobaccoOrDrugUseOrReferences':'NONE','contests':'NONE','gambling':False,'gamblingSimulated':'NONE','gunsOrOtherWeapons':'NONE','healthOrWellnessTopics':True,'lootBox':False,'medicalOrTreatmentInformation':'NONE','messagingAndChat':False,'parentalControls':False,'profanityOrCrudeHumor':'NONE','ageAssurance':False,'sexualContentGraphicAndNudity':'NONE','sexualContentOrNudity':'NONE','socialMedia':False,'socialMediaAgeRestricted':False,'horrorOrFearThemes':'NONE','matureOrSuggestiveThemes':'NONE','unrestrictedWebAccess':False,'userGeneratedContent':False,'violenceCartoonOrFantasy':'NONE','violenceRealisticProlongedGraphicOrSadistic':'NONE','violenceRealistic':'NONE','ageRatingOverrideV2':'NONE','koreaAgeRatingOverride':'NONE'}
    r=asc.api('PATCH',f'/v1/ageRatingDeclarations/{ID}',{'data':{'type':'ageRatingDeclarations','id':ID,'attributes':attrs}}); print('age rating', 'ok' if 'data' in r else json.dumps(r)[:200])
pts=asc.api('GET',f'/v1/apps/{APP}/appPricePoints?filter[territory]=USA&limit=5&fields[appPricePoints]=customerPrice')['data']
free=next(p for p in pts if float(p['attributes']['customerPrice'])==0)
r=asc.api('POST','/v1/appPriceSchedules',{'data':{'type':'appPriceSchedules','relationships':{'app':{'data':{'type':'apps','id':APP}},'baseTerritory':{'data':{'type':'territories','id':'USA'}},'manualPrices':{'data':[{'type':'appPrices','id':'${price1}'}]}}},'included':[{'type':'appPrices','id':'${price1}','attributes':{'startDate':None},'relationships':{'appPricePoint':{'data':{'type':'appPricePoints','id':free['id']}}}}]})
print('price Free', 'ok' if 'data' in r else json.dumps(r)[:200])
terr=[t['id'] for t in asc.api('GET','/v1/territories?limit=200')['data']]
rel=[{'type':'territoryAvailabilities','id':f'${{t{i}}}'} for i,_ in enumerate(terr)]
inc=[{'type':'territoryAvailabilities','id':f'${{t{i}}}','attributes':{'available':True},'relationships':{'territory':{'data':{'type':'territories','id':t}}}} for i,t in enumerate(terr)]
r=asc.api('POST','/v2/appAvailabilities',{'data':{'type':'appAvailabilities','attributes':{'availableInNewTerritories':True},'relationships':{'app':{'data':{'type':'apps','id':APP}},'territoryAvailabilities':{'data':rel}}},'included':inc})
print('availability', 'ok %d'%len(terr) if 'data' in r else json.dumps(r)[:200])
