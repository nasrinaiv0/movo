'use strict';
const crypto=require('crypto');
const PACKAGE='com.nasrinai.movo';
const sha=value=>crypto.createHash('sha256').update(value,'utf8').digest('hex');

/** This MUST use a server-verified Apple App Attest attestation, never a decoded token. */
async function apple({token,keyId,challenge}){
 const team=String(process.env.APPLE_TEAM_ID||'');
 if(!/^[A-Z0-9]{10}$/.test(team))throw new Error('attestation_not_configured');
 if(typeof keyId!=='string'||keyId.length<12||keyId.length>256)throw new Error('invalid_ios_key');
 if(typeof token!=='string'||token.length>32000||!/^[A-Za-z0-9+/]+={0,2}$/.test(token))
  throw new Error('invalid_ios_attestation');
 const bytes=Buffer.from(token,'base64');
 if(bytes.length<250||bytes.toString('base64').replace(/=+$/,'')!==token.replace(/=+$/,''))
  throw new Error('invalid_ios_attestation');
 const {verifyAttestation}=require('appattest-checker-node');
 const result=await verifyAttestation({appId:team+'.'+PACKAGE,developmentEnv:false},keyId,Buffer.from(challenge,'utf8'),bytes);
 if(!result||'verifyError' in result||!result.publicKeyPem)throw new Error('invalid_ios_attestation');
 return sha('ios:'+keyId);
}

/** Google Play Integrity is decoded by Google's trusted API; enforce app, cert,
 * integrity verdict, nonce, timestamp, licensing and production package. */
async function android({token,challenge}){
 const creds=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
 const cert=String(process.env.GOOGLE_PLAY_INTEGRITY_CERT_SHA256||'').trim();
 if(!creds||!cert)throw new Error('attestation_not_configured');
 const {google}=require('googleapis');
 const credentials=JSON.parse(creds);
 const auth=new google.auth.GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/playintegrity']});
 const play=google.playintegrity({version:'v1',auth});
 const result=await play.v1.decodeIntegrityToken({packageName:PACKAGE,requestBody:{integrityToken:token}});
 const payload=result.data?.tokenPayloadExternal||{};
 const request=payload.requestDetails||{}, app=payload.appIntegrity||{},device=payload.deviceIntegrity||{};
 const expected=crypto.createHash('sha256').update(challenge,'utf8').digest('base64url');
 const at=Number(request.timestampMillis);
 if(request.requestPackageName!==PACKAGE ||request.requestHash!==expected||
  !Number.isFinite(at)||Math.abs(Date.now()-at)>120000||
  app.packageName!==PACKAGE||app.appRecognitionVerdict!=='PLAY_RECOGNIZED'||
  !Array.isArray(app.certificateSha256Digest)||!app.certificateSha256Digest.includes(cert)||
  !Array.isArray(device.deviceRecognitionVerdict)||
  !device.deviceRecognitionVerdict.some(x=>x==='MEETS_DEVICE_INTEGRITY'||x==='MEETS_STRONG_INTEGRITY')||
  payload.accountDetails?.appLicensingVerdict!=='LICENSED')
  throw new Error('invalid_android_integrity');
 // Android Play Integrity intentionally does not expose a stable device ID.
 // Unique claim + rate limits + fraud review supplement token replay prevention.
 return sha('android:'+token);
}
async function verify({platform,format,token,keyId,challenge}){
 if(typeof token!=='string'||token.length<80||token.length>32000)throw new Error('invalid_proof');
 if(platform==='ios'&&format==='apple-app-attest')return apple({token,keyId,challenge});
 if(platform==='android'&&format==='google-play-integrity-standard')return android({token,challenge});
 throw new Error('unsupported_attestation');
}
module.exports={verify};