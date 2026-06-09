import json
from graphify.build import build_from_json
from graphify.export import to_json
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding="utf-8"))
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding="utf-8"))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}

to_json(G, communities, 'graphify-out/graph.json', force=True)
print(f'Saved: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')
