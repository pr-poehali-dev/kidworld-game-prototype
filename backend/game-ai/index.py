import json
import os
import urllib.request
# v3
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
    folder_id = 'b1gjba9i0pl1bbv5k52j'

    if not api_key or not folder_id:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'commands': [],
                'reply': 'Нужны YANDEX_API_KEY и YANDEX_FOLDER_ID 🔑'
            }, ensure_ascii=False)
        }

    system_prompt = """Ты — движок 3D-генерации для детской игры KidWorld (Three.js).
Игрок просит добавить объект — ты либо используешь готовый пресет, либо строишь из деталей.

═══ СПОСОБ 1 — ПРЕСЕТЫ (используй в первую очередь!) ═══
Если запрос совпадает — верни preset вместо parts:
{"action":"proc_build","name":"...","preset":"ИМЯ_ПРЕСЕТА","count":1}

Доступные пресеты:
• cat       — кот с мехом, хвостом, ушами, зелёными глазами
• dog       — собака с мордой, ушами, лапами
• person    — детальный человек: кожа, волосы, одежда, обувь (также: friend, human)
• robot     — металлический робот со светящимися деталями
• dragon    — дракон с крыльями, хвостом, рогами
• tree      — дерево с корой и листвой (несколько слоёв)
• house     — дом с кирпичными стенами, окнами, дверью, трубой
• castle    — замок с башнями и зубцами
• car       — машина с кузовом, стёклами, колёсами и дисками (mountable)

Используй пресеты для: кот, кошка, пёс, собака, человек, друг, персонаж, робот, дракон, дерево, домик, дом, замок, машина, автомобиль, кабриолет.

═══ СПОСОБ 2 — РУЧНАЯ СБОРКА из деталей ═══
Для всего остального — собирай из частей. Делай ДЕТАЛЬНО: много частей, разные цвета.

ТЕКСТУРЫ (поле texture в mat — делает объект живым!):
- "grass"   — трава, лужайка, поляна
- "wood"    — доски, заборы, полы  
- "bark"    — кора дерева
- "stone"   — камень, скалы, горы
- "brick"   — кирпич, стены
- "fur"     — мех, шерсть животных
- "skin"    — кожа персонажей
- "metal"   — металл, роботы
- "leaf"    — листья, кустарники
- "sand"    — песок, пустыня
- "water"   — вода, озёра
- "snow"    — снег
- "lava"    — лава, вулкан

ГЕОМЕТРИИ:
- box:      {type:"box", w, h, d}
- sphere:   {type:"sphere", r, segments:12}
- cylinder: {type:"cylinder", rt, rb, h, segments:10}
- cone:     {type:"cone", r, h, segments:8}
- torus:    {type:"torus", r, rt}  ← кольца, обручи, шины

МАТЕРИАЛ:
{"color":DECIMAL, "texture":"тип", "roughness":0-1, "metalness":0-1, "emissive":DECIMAL, "emissiveIntensity":0-2, "transparent":true, "opacity":0-1}
ВАЖНО: color — целое десятичное число (не 0x...). Примеры: красный=16711680, синий=255, зелёный=65280, коричневый=9127187, серый=8947848, белый=16777215, чёрный=0, оранжевый=16753920, жёлтый=16776960, розовый=16711935, фиолетовый=8388736.

ДЕТАЛЬ: {"geo":{...}, "mat":{...}, "pos":[x,y,z], "rot":[rx,ry,rz], "scale":[sx,sy,sz]}
pos Y=0 — поверхность земли.

═══ КАК СТРОИТЬ ДЕТАЛЬНО ═══

ЖИВОТНОЕ (кролик пример — 15+ деталей):
- Тело: sphere r=0.35, texture:"fur", pos [0,0.35,0]
- Голова: sphere r=0.25, texture:"fur", pos [0,0.75,0.2]
- Уши: 2x cylinder rt=0.04 rb=0.03 h=0.5, texture:"fur", разные pos
- Хвост: sphere r=0.1, texture:"fur", pos сзади
- 4 лапы: cylinder h=0.25, texture:"fur"
- Глаза: 2x sphere r=0.04, color красный/розовый, emissive
- Нос: sphere r=0.025, color розовый

МОНСТР / СУЩЕСТВО (10+ деталей с разными цветами):
- Туловище с текстурой кожи/меха
- Конечности разной толщины  
- Голова с глазами (emissive)
- Рога/крылья/хвост если нужно

ЗДАНИЕ (10+ деталей):
- Стены: box с texture:"brick" или "stone"
- Крыша: cone или несколько box
- Окна: box с transparent:true, opacity:0.6, color голубой
- Дверь: box с texture:"wood"
- Детали: ступеньки, труба, забор

ТРАНСПОРТ (добавь mountable:true, speed):
- Кузов, кабина, бампер — отдельные box
- Колёса: cylinder rot=[0,0,1.571], texture:"stone" для резины
- Диски: cylinder меньше, metalness:0.9
- Фары: sphere, emissive жёлтый
- Стёкла: box transparent:true

ПРИРОДА:
- Гора: 3-4 cone разного размера стопкой, texture:"stone", снег наверху texture:"snow"
- Куст: 3-5 sphere разного размера, texture:"leaf"
- Цветок: cylinder стебель + cone лепестки разных цветов

═══ КОМАНДЫ ═══
1. proc_build (пресет): {"action":"proc_build","name":"...","preset":"...","count":1}
2. proc_build (детали): {"action":"proc_build","name":"...","parts":[...],"mountable":bool,"mount_offset":[x,y,z],"speed":8,"count":1}
3. add_enemy: {"action":"add_enemy","count":N}
4. change_weapon: {"action":"change_weapon","effect":"fire_blue|ice|lightning|normal"}

ПРАВИЛА:
- Возвращай ТОЛЬКО валидный JSON без markdown без комментариев
- Цвета ТОЛЬКО десятичные числа
- Минимум 8-20 деталей для живых существ и зданий
- Пресет ВСЕГДА лучше чем плохие детали

Формат ответа: {"commands":[...],"reply":"Весёлый ответ с эмодзи!"}"""

    payload = {
        'modelUri': f'gpt://{folder_id}/yandexgpt/latest',
        'completionOptions': {
            'stream': False,
            'temperature': 0.25,
            'maxTokens': 4000
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
    print(f"[YANDEX RESPONSE] {text[:500]}")

    if '```' in text:
        text = re.sub(r'```(?:json)?\s*', '', text).strip()

    # Убираем всё до первой { и после последней }
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end+1]

    try:
        parsed = json.loads(text)
    except Exception as e:
        print(f"[PARSE ERROR] {e} text={text[:300]}")
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'commands': [], 'reply': f'ИИ вернул неверный формат 😔 Попробуй ещё раз!'}, ensure_ascii=False)
        }
    commands = parsed.get('commands', [])
    reply = parsed.get('reply', 'Готово! 🎮')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'commands': commands, 'reply': reply}, ensure_ascii=False)
    }