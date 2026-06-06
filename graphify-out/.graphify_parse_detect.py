import json
d = json.loads(open('graphify-out/.graphify_detect.json', encoding='utf-8-sig').read())
print('total_files:', d.get('total_files', '?'))
print('total_words:', d.get('total_words', '?'))
cats = d.get('files', {})
for k, v in cats.items():
    if v:
        print(f'  {k}: {len(v)} files')
if d.get('top_dirs'):
    print('Top dirs:')
    for p, c in d['top_dirs'][:5]:
        print(f'  {p}: {c} files')
if d.get('skipped_sensitive'):
    print(f'skipped_sensitive: {len(d["skipped_sensitive"])} files')
