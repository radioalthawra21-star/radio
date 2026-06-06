import json
from pathlib import Path

analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding="utf-8-sig"))
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding="utf-8"))

node_map = {}
for n in extraction['nodes']:
    node_map[n['id']] = n.get('label', n['id'])

comm_sizes = sorted([(int(k), v) for k, v in analysis['communities'].items()], key=lambda x: len(x[1]), reverse=True)

# Show all communities with >= 5 nodes
for cid, nodes in comm_sizes:
    if len(nodes) >= 5:
        labels = [node_map.get(n, n) for n in nodes[:5]]
        print(f'{cid}: {", ".join(labels)}')
