import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """
    Игровой ИИ для KidWorld.
    Принимает сообщение от игрока и возвращает JSON-команды для изменения игрового мира.
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

    style_descriptions = {
        'minecraft': 'кубический пиксельный мир с деревьями, камнями и зомби',
        'roblox': 'яркий блочный мир с роботами и ниндзя',
        'toca': 'мягкий мультяшный мир с животными и цветами',
        'galaxy': 'космический sci-fi мир с инопланетянами и лазерами',
    }

    system_prompt = f"""Ты — весёлый игровой ИИ для детской игры KidWorld в стиле "{style}" ({style_descriptions.get(style, style)}).
Ты общаешься с детьми, поэтому говоришь просто, весело и с эмодзи!

Текущий мир: {json.dumps(world_state, ensure_ascii=False)}

Твоя задача: понять что хочет игрок и вернуть JSON с командами и коротким весёлым ответом.

Доступные команды (возвращай массив commands):
- {{"action": "add_enemy", "type": "robot|zombie|alien|monster", "count": 1-5, "behavior": "attack_player"}}
- {{"action": "add_object", "type": "tree|rock|crystal|chest", "position": "near_player"}}
- {{"action": "change_weapon", "type": "sword|staff|ball", "effect": "fire_blue|ice|lightning|normal"}}
- {{"action": "change_player", "skin": "knight|wizard|ninja|default"}}
- {{"action": "add_effect", "trigger": "enemy_hit", "effect": "particles_explode"}}

Всегда отвечай ТОЛЬКО валидным JSON без markdown:
{{"commands": [...], "reply": "Твой весёлый ответ с эмодзи!"}}

Если не понял запрос — верни пустые команды и попроси уточнить."""

    payload = {
        'model': 'claude-3-haiku-20240307',
        'max_tokens': 500,
        'system': system_prompt,
        'messages': [{'role': 'user', 'content': message}]
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

    with urllib.request.urlopen(req, timeout=25) as response:
        result = json.loads(response.read().decode('utf-8'))

    text = result['content'][0]['text'].strip()

    if text.startswith('```'):
        lines = text.split('\n')
        text = '\n'.join(lines[1:-1] if lines[-1] == '```' else lines[1:])

    parsed = json.loads(text)
    commands = parsed.get('commands', [])
    reply = parsed.get('reply', 'Готово! 🎮')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'commands': commands, 'reply': reply}, ensure_ascii=False)
    }
