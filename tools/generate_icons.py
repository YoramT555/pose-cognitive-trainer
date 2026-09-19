from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
BLUE = "#3157d5"


def make_icon(size: int, filename: str, rounded: bool = True) -> None:
    scale = size / 512
    image = Image.new("RGB", (size, size), BLUE)
    draw = ImageDraw.Draw(image)

    # White brain silhouette, matching icon.svg and kept inside the maskable safe zone.
    points = [
        (256, 92), (214, 92), (177, 126), (174, 170), (135, 174), (105, 207),
        (105, 247), (105, 278), (123, 305), (150, 317), (148, 325), (147, 333),
        (147, 341), (147, 384), (182, 420), (226, 420), (237, 420), (247, 418),
        (256, 414), (265, 418), (275, 420), (286, 420), (330, 420), (365, 384),
        (365, 341), (365, 333), (364, 325), (362, 317), (389, 305), (407, 278),
        (407, 247), (407, 207), (377, 174), (338, 170), (335, 126), (298, 92),
    ]
    pts = [(round(x * scale), round(y * scale)) for x, y in points]
    draw.polygon(pts, fill="#f7f8ff")

    width = max(4, round(22 * scale))
    lines = [
        [(256, 129), (256, 383)],
        [(179, 184), (198, 189), (214, 202), (226, 221), (234, 246)],
        [(333, 184), (314, 189), (298, 202), (286, 221), (278, 246)],
        [(169, 297), (190, 289), (210, 293), (226, 309), (234, 342)],
        [(343, 297), (322, 289), (302, 293), (286, 309), (278, 342)],
    ]
    for line in lines:
        draw.line([(round(x * scale), round(y * scale)) for x, y in line], fill=BLUE, width=width, joint="curve")

    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(112 * scale), fill=255)
        image.putalpha(mask)

    image.save(ICONS / filename, optimize=True)


if __name__ == "__main__":
    ICONS.mkdir(exist_ok=True)
    make_icon(192, "icon-192.png")
    make_icon(512, "icon-512.png")
    make_icon(512, "icon-maskable-512.png", rounded=False)
    make_icon(180, "apple-touch-icon.png")
