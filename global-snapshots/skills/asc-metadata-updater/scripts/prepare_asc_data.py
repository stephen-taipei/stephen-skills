#!/usr/bin/env python3
"""Prepare ASC update data from docs/app-store/finished/ files.

Reads all app-info-*.txt files, extracts metadata fields, validates character limits,
and outputs JSON for browser injection.

Usage: python3 prepare_asc_data.py <project_root> [output_path]
Default output: /tmp/asc_update_data.json
"""
import os, sys, json, re, glob

FIELD_MAP = {
    'App 名稱': 'appName',
    '副標題': 'subtitle',
    '宣傳文字': 'promotionalText',
    '關鍵字': 'keywords',
    '描述': 'description',
}

LIMITS = {
    'appName': 30,
    'subtitle': 30,
    'promotionalText': 170,
    'keywords': 100,
    'description': 4000,
}

LOCALE_MAP = {
    '丹麥文': 'da', '俄文': 'ru', '克羅埃西亞文': 'hr', '加泰羅尼亞文': 'ca',
    '匈牙利文': 'hu', '北印度文': 'hi', '印尼文': 'id', '土耳其文': 'tr',
    '希臘文': 'el', '德文': 'de-DE', '挪威文': 'no', '捷克文': 'cs',
    '斯洛伐克文': 'sk', '法文': 'fr-FR', '法文（加拿大）': 'fr-CA',
    '波蘭文': 'pl', '烏克蘭文': 'uk', '瑞典文': 'sv', '羅馬尼亞文': 'ro',
    '義大利文': 'it', '芬蘭文': 'fi', '英文（加拿大）': 'en-CA',
    '英文（澳洲）': 'en-AU', '英文（美國）': 'en-US', '英文（英國）': 'en-GB',
    '荷蘭文': 'nl-NL', '葡萄牙文（巴西）': 'pt-BR', '葡萄牙文（葡萄牙）': 'pt-PT',
    '西班牙文（墨西哥）': 'es-MX', '西班牙文（西班牙）': 'es-ES',
    '越南文': 'vi', '馬來文': 'ms', '希伯來文': 'he', '阿拉伯文': 'ar-SA',
    '泰文': 'th', '日文': 'ja', '韓文': 'ko',
    '簡體中文': 'zh-Hans', '繁體中文': 'zh-Hant',
}

def parse_app_info(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract locale from filename
    m = re.search(r'app-info-(.+?)\.txt$', os.path.basename(filepath))
    if not m:
        return None, None
    locale_name = m.group(1)
    locale_code = LOCALE_MAP.get(locale_name)
    if not locale_code:
        print(f"  WARNING: Unknown locale '{locale_name}', skipping", file=sys.stderr)
        return None, None

    data = {}
    current_field = None
    current_lines = []

    for line in content.split('\n'):
        matched = False
        for zh_key, en_key in FIELD_MAP.items():
            if line.startswith(zh_key + '：') or line.startswith(zh_key + ':'):
                if current_field:
                    data[current_field] = '\n'.join(current_lines).strip()
                current_field = en_key
                value = line.split('：', 1)[-1] if '：' in line else line.split(':', 1)[-1]
                current_lines = [value.strip()]
                matched = True
                break
        if not matched and current_field:
            current_lines.append(line)

    if current_field:
        data[current_field] = '\n'.join(current_lines).strip()

    return locale_code, data

def main():
    project_root = sys.argv[1] if len(sys.argv) > 1 else '.'
    output_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/asc_update_data.json'

    finished_dir = os.path.join(project_root, 'docs/app-store/finished')
    files = sorted(glob.glob(os.path.join(finished_dir, 'app-info-*.txt')))

    if not files:
        print(f"ERROR: No app-info files found in {finished_dir}", file=sys.stderr)
        sys.exit(1)

    all_data = {}
    warnings = []

    for f in files:
        locale_code, data = parse_app_info(f)
        if not locale_code:
            continue

        # Validate limits
        for field, limit in LIMITS.items():
            if field in data and len(data[field]) > limit:
                warnings.append(f"  {locale_code}.{field}: {len(data[field])}/{limit} chars (OVER)")

        all_data[locale_code] = data

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"Parsed {len(all_data)} locales -> {output_path}")
    if warnings:
        print("Warnings:")
        for w in warnings:
            print(w)

if __name__ == '__main__':
    main()
