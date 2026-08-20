"""Register the Mini App URL as the bot's menu button and verify the webhook."""
import os, sys, requests
BOT_TOKEN=os.environ.get('BOT_TOKEN','')
WEB_APP_URL=os.environ.get('WEB_APP_URL','')
if not BOT_TOKEN or not WEB_APP_URL:
    print('Set BOT_TOKEN and WEB_APP_URL first.'); sys.exit(1)
API=f'https://api.telegram.org/bot{BOT_TOKEN}'

def call(method,payload):
    r=requests.post(f'{API}/{method}',json=payload,timeout=15); print(method, r.json()); return r.json()
call('setChatMenuButton', {'menu_button': {'type':'web_app','text':'Security Dashboard','web_app':{'url':WEB_APP_URL}}})
print('Mini App:', WEB_APP_URL)
