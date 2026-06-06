import json
import os
import urllib.request
import re


def handler(event: dict, context) -> dict:
    """
    Игровой ИИ для KidWorld на базе Yandex GPT.
    Принимает текстовый запрос и возвращает процедурные 3D-объекты из примитивов Three.js.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    message = body.get('message', '')
    style = body.get('style', 'minecraft')

    if not message:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'message is required'})
        }

    api_key = os.environ.get('YANDEX_API_KEY', '').strip()
    folder_id = os.environ.get('YANDEX_FOLDER_ID', '').strip()

    if not api_key or not folder_id:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'commands': [],
                'reply': 'Нужны YANDEX_API_KEY и YANDEX_FOLDER_ID 🔑'
            }, ensure_ascii=False)
        }

    system_prompt = """Ты — движок процедурной генерации 3D-объектов для детской игры KidWorld (Three.js).

Игрок пишет что хочет добавить в мир — ты строишь это из 3D-примитивов.

ГЕОМЕТРИИ (geo):
- box: {type:"box", w, h, d}
- sphere: {type:"sphere", r, segments}
- cylinder: {type:"cylinder", rt, rb, h, segments}
- cone: {type:"cone", r, h, segments}

МАТЕРИАЛ (mat):
- color: число hex (например 8978176 для 0x888888)
- emissive: число hex (опционально)
- emissiveIntensity: 0.0-2.0
- roughness: 0.0-1.0
- metalness: 0.0-1.0
- transparent: true/false
- opacity: 0.0-1.0

ЧАСТЬ ОБЪЕКТА (part):
{"geo": {...}, "mat": {...}, "pos": [x,y,z], "rot": [rx,ry,rz], "scale": [sx,sy,sz]}

КОМАНДЫ:
1. proc_build: {"action":"proc_build","name":"...","parts":[...],"mountable":bool,"mount_offset":[x,y,z],"speed":8,"count":1}
2. add_enemy: {"action":"add_enemy","type":"robot|zombie|alien","count":1}
3. change_weapon: {"action":"change_weapon","effect":"fire_blue|ice|lightning|normal"}

ПРИМЕРЫ (цвета как десятичные числа):
Гора: parts с конусами, color=8947848(серый), pos Y растёт вверх
Дерево: цилиндр ствол color=9127187(коричневый) + сфера крона color=2263842(зелёный)
Машина: box кузов + 4 cylinder колеса, mountable:true, speed:10
Дом: box стены + cone крыша

ПРАВИЛА:
- Возвращай ТОЛЬКО валидный JSON без markdown
- Цвета ТОЛЬКО как целые десятичные числа (не 0x...)
- pos Y=0 поверхность земли

Формат: {"commands":[...],"reply":"Весёлый ответ с эмодзи!"}"""

    payload = {
        'modelUri': f'gpt://{folder_id}/yandexgpt/latest',
        'completionOptions': {
            'stream': False,
            'temperature': 0.3,
            'maxTokens': 2000
        },
        'messages': [
            {'role': 'system', 'text': system_prompt},
            {'role': 'user', 'text': f'Стиль мира: {style}. Запрос игрока: {message}'}
        ]
    }

    req = urllib.request.Request(
        'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Api-Key {api_key}',
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=28) as response:
            result = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"[YANDEX ERROR] status={e.code} body={error_body}")
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'commands': [], 'reply': f'Ошибка API {e.code}: {error_body[:300]}'}, ensure_ascii=False)
        }

    text = result['result']['alternatives'][0]['message']['text'].strip()

    if '```' in text:
        text = re.sub(r'```(?:json)?\s*', '', text).strip()

    parsed = json.loads(text)
    commands = parsed.get('commands', [])
    reply = parsed.get('reply', 'Готово! 🎮')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'commands': commands, 'reply': reply}, ensure_ascii=False)
    }
