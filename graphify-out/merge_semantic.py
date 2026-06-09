import json
from pathlib import Path

# Read with utf-8-sig to handle BOM
raw = Path('graphify-out/.graphify_semantic_new.json').read_bytes()
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]
data = json.loads(raw)

# Save without BOM
Path('graphify-out/.graphify_semantic_new.json').write_text(
    json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Fixed BOM: {len(data["nodes"])} nodes, {len(data["edges"])} edges')

# Save to cache
from graphify.cache import save_semantic_cache
saved = save_semantic_cache(
    data.get('nodes', []), data.get('edges', []), data.get('hyperedges', []))
print(f'Cached {saved} files')

# Merge with cached
cached = {'nodes': [], 'edges': [], 'hyperedges': []}
cached_path = Path('graphify-out/.graphify_cached.json')
if cached_path.exists():
    raw_c = cached_path.read_bytes()
    if raw_c[:3] == b'\xef\xbb\xbf':
        raw_c = raw_c[3:]
    cached = json.loads(raw_c)

all_nodes = cached['nodes'] + data.get('nodes', [])
all_edges = cached['edges'] + data.get('edges', [])
all_hyperedges = cached.get('hyperedges', []) + data.get('hyperedges', [])
seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)

merged = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': data.get('input_tokens', 0),
    'output_tokens': data.get('output_tokens', 0),
}
Path('graphify-out/.graphify_semantic.json').write_text(
    json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Semantic merge done: {len(deduped)} nodes, {len(all_edges)} edges '
      f'({len(cached["nodes"])} cached, {len(data.get("nodes",[]))} new)')
