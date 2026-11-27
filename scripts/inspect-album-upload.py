"""Decode one uploaded photo and generate the same previews as the album importer."""
import json
import runpy
import sys
import warnings
from pathlib import Path
from PIL import Image

source, previews, digest, name = sys.argv[1:]
indexer = runpy.run_path(str(Path(__file__).with_name('index-photo-album.py')))
warnings.simplefilter('error', Image.DecompressionBombWarning)
metadata = indexer['image_metadata_and_views'](Path(source), Path(previews), digest, '', name)
expected = {'.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.png':'image/png', '.webp':'image/webp'}
if metadata['mime'] != expected.get(Path(name).suffix.lower()):
    raise ValueError('Image extension and content differ')
print(json.dumps(metadata))
