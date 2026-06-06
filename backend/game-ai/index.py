import json
import os
import urllib.request


def handler(event: dict, context) -> dict:
    """
    Игровой ИИ для KidWorld.
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
    world_state = body.get('world_state', {})

    if not message:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'message is required'})
        }

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'commands': [],
                'reply': 'Для работы ИИ нужен ANTHROPIC_API_KEY 🔑 Добавь его в секреты проекта!'
            }, ensure_ascii=False)
        }

    system_prompt = """Ты — движок процедурной генерации 3D-объектов для детской игры KidWorld (Three.js).

Игрок пишет что хочет добавить в мир — ты строишь это из 3D-примитивов.

ГЕОМЕТРИИ (geo):
- box: {w, h, d} — прямоугольник
- sphere: {r, segments} — сфера (segments 4-16)
- cylinder: {rt, rb, h, segments} — цилиндр (rt=верх, rb=низ радиус)
- cone: {r, h, segments} — конус

МАТЕРИАЛ (mat):
- color: hex число (например 0xFF0000)
- emissive: hex (свечение, опционально)
- emissiveIntensity: 0.0-2.0
- roughness: 0.0-1.0
- metalness: 0.0-1.0
- transparent: true/false
- opacity: 0.0-1.0

ЧАСТЬ ОБЪЕКТА (part):
{
  "geo": {...},
  "mat": {...},
  "pos": [x, y, z],
  "rot": [rx, ry, rz],  (в радианах, опционально)
  "scale": [sx, sy, sz]  (опционально)
}

КОМАНДЫ:

1. proc_build — построить произвольный объект из частей:
{
  "action": "proc_build",
  "name": "название объекта",
  "parts": [...],
  "mountable": true/false,  (можно ли сесть — для транспорта)
  "mount_offset": [x, y, z],  (где сидит игрок относительно объекта)
  "speed": 8.0,  (скорость движения если mountable)
  "count": 1  (сколько копий добавить)
}

2. add_enemy — добавить врага:
{"action": "add_enemy", "type": "robot|zombie|alien|monster", "count": 1}

3. change_weapon — изменить оружие:
{"action": "change_weapon", "effect": "fire_blue|ice|lightning|normal"}

4. change_player — изменить скин:
{"action": "change_player", "skin": "knight|wizard|ninja|default"}

ПРИМЕРЫ ОБЪЕКТОВ:

Гора (несколько конусов):
parts: [
  {geo:{type:"cone",r:4,h:5,segments:6}, mat:{color:0x888888,roughness:0.9}, pos:[0,0,0]},
  {geo:{type:"cone",r:2.5,h:4,segments:6}, mat:{color:0x777777,roughness:0.9}, pos:[0,3,0]},
  {geo:{type:"cone",r:1.5,h:3,segments:6}, mat:{color:0xffffff,roughness:0.7}, pos:[0,5.5,0]}
]

Автомобиль (mountable):
parts: [
  {geo:{type:"box",w:2.4,h:0.6,d:1.2}, mat:{color:0xFF3300,roughness:0.3,metalness:0.7}, pos:[0,0.3,0]},
  {geo:{type:"box",w:1.6,h:0.6,d:1.1}, mat:{color:0xFF3300,roughness:0.3,metalness:0.7}, pos:[0,0.9,0]},
  {geo:{type:"cylinder",rt:0.35,rb:0.35,h:0.25,segments:12}, mat:{color:0x111111,roughness:0.9}, pos:[-0.8,0,0.6], rot:[1.5708,0,0]},
  {geo:{type:"cylinder",rt:0.35,rb:0.35,h:0.25,segments:12}, mat:{color:0x111111,roughness:0.9}, pos:[0.8,0,0.6], rot:[1.5708,0,0]},
  {geo:{type:"cylinder",rt:0.35,rb:0.35,h:0.25,segments:12}, mat:{color:0x111111,roughness:0.9}, pos:[-0.8,0,-0.6], rot:[1.5708,0,0]},
  {geo:{type:"cylinder",rt:0.35,rb:0.35,h:0.25,segments:12}, mat:{color:0x111111,roughness:0.9}, pos:[0.8,0,-0.6], rot:[1.5708,0,0]},
  {geo:{type:"box",w:0.6,h:0.3,d:0.3}, mat:{color:0xFFFF88,emissive:0xFFFF00,emissiveIntensity:1.5}, pos:[1.1,0.3,0.4]},
  {geo:{type:"box",w:0.6,h:0.3,d:0.3}, mat:{color:0xFFFF88,emissive:0xFFFF00,emissiveIntensity:1.5}, pos:[1.1,0.3,-0.4]}
]
mountable: true, mount_offset: [0,1.2,0], speed: 10

Дерево:
parts: [
  {geo:{type:"cylinder",rt:0.15,rb:0.2,h:1.5,segments:6}, mat:{color:0x8B4513,roughness:0.9}, pos:[0,0.75,0]},
  {geo:{type:"sphere",r:1.0,segments:7}, mat:{color:0x228B22,roughness:0.8}, pos:[0,2.3,0]}
]

Дом:
parts: [
  {geo:{type:"box",w:3,h:2.5,d:3}, mat:{color:0xF5DEB3,roughness:0.8}, pos:[0,1.25,0]},
  {geo:{type:"cone",r:2.2,h:1.8,segments:4}, mat:{color:0x8B2222,roughness:0.7}, pos:[0,3.4,0], rot:[0,0.7854,0]},
  {geo:{type:"box",w:0.6,h:1.0,d:0.2}, mat:{color:0x5C3317,roughness:0.9}, pos:[0,0.5,1.51]},
  {geo:{type:"box",w:0.5,h:0.5,d:0.2}, mat:{color:0x87CEEB,transparent:true,opacity:0.7}, pos:[0.9,1.5,1.51]}
]

ВАЖНЫЕ ПРАВИЛА:
- Всегда возвращай ТОЛЬКО валидный JSON без markdown-блоков
- Для сложных объектов (гора, замок, лес) добавляй count для повторов или несколько proc_build
- Объекты с колёсами/сёдлами — всегда mountable:true
- Для гор: используй несколько конусов/сфер на разной высоте
- Цвета в числовом hex формате: 0xRRGGBB
- pos Y=0 это поверхность земли

Формат ответа:
{"commands": [...], "reply": "Весёлый ответ с эмодзи!"}"""

    payload = {
        'model': 'claude-3-5-haiku-20241022',
        'max_tokens': 3000,
        'system': system_prompt,
        'messages': [{'role': 'user', 'content': f'Стиль мира: {style}. Запрос: {message}'}]
    }

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
        },
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=28) as response:
        result = json.loads(response.read().decode('utf-8'))

    text = result['content'][0]['text'].strip()

    # Убираем markdown-блоки если есть
    if '```' in text:
        import re
        text = re.sub(r'```(?:json)?\s*', '', text).strip()

    parsed = json.loads(text)
    commands = parsed.get('commands', [])
    reply = parsed.get('reply', 'Готово! 🎮')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'commands': commands, 'reply': reply}, ensure_ascii=False)
    }
