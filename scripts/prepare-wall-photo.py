"""Make a photo safe and light enough for the website's walls.

Usage:  python3 scripts/prepare-wall-photo.py "<original photo>" public/assets/wall-photos/<name>.jpg

It turns the photo the right way up, shrinks it so its longest side is 800 px, and saves a fresh JPEG with no
hidden data (no camera model, date or location). Your original file is never changed.
Needs Pillow:  pip install pillow
"""
import sys
from PIL import Image, ImageOps

LONGEST_SIDE = 800
QUALITY = 82


def main(src, dest):
    img = ImageOps.exif_transpose(Image.open(src))  # applies the phone's "rotate me" flag
    img = img.convert("RGB")
    img.thumbnail((LONGEST_SIDE, LONGEST_SIDE), Image.LANCZOS)
    img.save(dest, "JPEG", quality=QUALITY, optimize=True)  # no exif= argument, so nothing hidden is carried over
    print(f"wrote {dest}: {img.size[0]} x {img.size[1]} px")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
