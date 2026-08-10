#!/usr/bin/env python3
"""Organize trip originals and build browser-friendly media derivatives.

The raw camera files live in ``assets/Costa Rica/day-XX``.  This script creates
smaller progressive JPEGs, H.264 MP4s, cropped carousel thumbnails, and a
manifest in ``assets/photos/``. Originals are never resized or overwritten.
"""

from __future__ import annotations

import argparse
import ctypes
import json
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from ctypes import POINTER, Structure, byref, c_char_p, c_int, c_ubyte, c_void_p
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / "assets" / "Costa Rica"
WEB = ROOT / "assets" / "photos"
PUBLIC_MEDIA_ROOT = "/r2"
THUMB_SIZE = "640x480"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".heic"}
VIDEO_SUFFIXES = {".mp4", ".mov"}
MEDIA_SUFFIXES = IMAGE_SUFFIXES | VIDEO_SUFFIXES
# Keep excluded media in the derivative set and R2 so restoring it only
# requires removing an entry here and rebuilding the manifest.
EXCLUDED_MEDIA = {(8, "photo", 9)}
MEDIA_CAPTIONS = {
    (1, "photo", 1): "Ready for takeoff",
    (1, "photo", 2): "Seatmates for the flight south",
    (1, "photo", 3): "All together on Costa Rican roads",
    (2, "photo", 1): "Morning above Zarcero",
    (2, "video", 1): "Stepping out into the highlands",
    (2, "photo", 2): "Meeting Zarcero's topiary elephant",
    (2, "video", 2): "A spin around Zarcero's bandstand",
    (2, "video", 3): "A walk through the living sculptures",
    (2, "photo", 3): "At the grotto in Zarcero",
    (2, "photo", 4): "Inside Zarcero's painted church",
    (2, "video", 4): "First look at the waterfall",
    (2, "photo", 5): "A misty pose beneath the falls",
    (2, "photo", 6): "Together beneath the falls",
    (2, "photo", 7): "Waterfall faces",
    (2, "photo", 8): "His turn beneath the falls",
    (2, "photo", 9): "Soaked at the base of the falls",
    (2, "photo", 10): "Four smiles in the spray",
    (2, "photo", 11): "Her turn at the waterfall",
    (2, "photo", 12): "Red raincoat, white water",
    (2, "video", 5): "Rock-hopping below the falls",
    (2, "photo", 13): "Crossing above the rushing river",
    (2, "photo", 14): "One more waterfall portrait",
    (2, "video", 6): "Finding the deepest puddles",
    (2, "photo", 15): "A family selfie by the falls",
    (2, "photo", 16): "Rainy river overlook",
    (2, "photo", 17): "An ankle-deep family portrait",
    (2, "photo", 18): "Out cold on the road to Arenal",
    (2, "photo", 19): "Lunch after the waterfall",
    (2, "video", 7): "The waterfall in full force",
    (2, "photo", 20): "Dinner smiles in La Fortuna",
    (2, "photo", 21): "Robes on, vacation mode",
    (3, "photo", 1): "Rainy start at Místico",
    (3, "video", 1): "Above the canopy in the rain",
    (3, "photo", 2): "Together on the hanging bridge",
    (3, "photo", 3): "A sloth-themed Valentine",
    (3, "photo", 4): "Tiny eggs beneath a leaf",
    (3, "photo", 5): "A golden snail on the trail",
    (3, "photo", 6): "Strawberry poison dart frog",
    (3, "photo", 7): "Lunch with Arenal in view",
    (3, "photo", 8): "Swinging beneath the volcano",
    (3, "photo", 9): "Framed by Arenal",
    (3, "photo", 10): "The best seat in front of Arenal",
    (3, "photo", 11): "Family portrait under Arenal",
    (3, "photo", 12): "Taking in the volcano together",
    (3, "photo", 13): "Mother-daughter moment at Arenal",
    (3, "photo", 14): "Arenal all to herself",
    (3, "photo", 15): "Church stop in La Fortuna",
    (3, "photo", 16): "Red-eyed tree frog after dark",
    (3, "photo", 17): "A tiny frog calling in the rain",
    (3, "photo", 18): "Eight legs after dark",
    (3, "photo", 19): "A sleepy sloth in the canopy",
    (4, "photo", 1): "Lunch before the coffee-and-chocolate tour",
    (4, "video", 1): "From cacao pod to chocolate",
    (4, "video", 2): "The first chocolate taste test",
    (4, "video", 3): "Taking a turn at the sugar-cane press",
    (4, "video", 4): "Fresh sugar cane through the rollers",
    (4, "photo", 2): "Coffee during the coffee-and-chocolate tour",
    (5, "photo", 1): "Trailhead at Arenal 1968",
    (5, "photo", 2): "Three hikers beneath the clouds",
    (5, "photo", 3): "Dabbing above the lava fields",
    (5, "photo", 4): "Together on the old lava flow",
    (5, "photo", 5): "At the summit of the lava trail",
    (5, "photo", 6): "Family portrait on the lava field",
    (5, "video", 1): "Back to the hot springs",
    (5, "photo", 7): "Volcano views with the girls",
    (5, "photo", 8): "Arenal hiking partners",
    (5, "photo", 9): "A clear view across Lake Arenal",
    (5, "photo", 10): "A rocky perch beneath the volcano",
    (5, "photo", 11): "Back in the thermal river",
    (5, "photo", 12): "Standing beneath the hot-spring falls",
    (5, "photo", 13): "Waterfall curtain at Tabacón",
    (5, "photo", 14): "Drying off after the falls",
    (5, "photo", 15): "Dinner with a couple of regulars",
    (5, "photo", 16): "Date night under the signposts",
    (5, "photo", 17): "Dinner companions in La Fortuna",
    (5, "photo", 18): "A tableside visit from the house cat",
    (5, "video", 2): "Making friends with the dinner cat",
    (6, "photo", 1): "Coffee stop at Café Sloffee",
    (6, "photo", 2): "Leaving our mark on the coffee wall",
    (6, "photo", 3): "Coffee for the long drive south",
    (6, "photo", 4): "Road-trip lunch on the Costanera",
    (6, "photo", 5): "First crocodile lookout",
    (6, "video", 1): "Crocodiles below the Tárcoles bridge",
    (6, "photo", 6): "A crocodile on the riverbank",
    (6, "photo", 7): "Cruising through the Tárcoles",
    (6, "photo", 8): "Crocodile watching from the bridge",
    (6, "photo", 9): "Two crocodiles in the shallows",
    (6, "photo", 10): "We made it to Jacó",
    (6, "photo", 11): "Pacific overlook above Jacó",
    (6, "photo", 12): "Three smiles over the Pacific",
    (6, "photo", 13): "First look at the room in Uvita",
    (6, "video", 2): "Opening the doors to the Pacific",
    (6, "photo", 14): "Settling into the villa",
    (6, "photo", 15): "Poolside dinner after the drive",
    (6, "photo", 16): "Night-swim smiles",
    (7, "photo", 1): "Boat ride to Corcovado",
    (7, "photo", 2): "Welcome to San Pedrillo",
    (7, "video", 1): "A bat tucked beneath a palm leaf",
    (7, "photo", 3): "Golden orb-weaver in her web",
    (7, "photo", 4): "A monkey high in the canopy",
    (7, "photo", 5): "Something hiding in the vines",
    (7, "photo", 6): "An owl tucked into the branches",
    (7, "photo", 7): "A woodpecker at work",
    (7, "photo", 8): "Leafcutter ants on the march",
    (7, "photo", 9): "Owl eyes in the rainforest",
    (7, "photo", 10): "Scarlet macaw in the canopy",
    (7, "video", 2): "Scarlet macaws overhead",
    (7, "photo", 11): "Trail snack in San Pedrillo",
    (7, "photo", 12): "Rainforest smiles",
    (7, "photo", 13): "Beachcombers at San Pedrillo",
    (7, "photo", 14): "At the edge of Corcovado",
    (7, "photo", 15): "Tracks in the sand",
    (7, "photo", 16): "A tropical bird on watch",
    (7, "photo", 17): "Four hikers beneath a forest giant",
    (7, "photo", 18): "Corcovado beach portrait",
    (7, "photo", 19): "Rocky shoreline at low tide",
    (7, "video", 3): "Wading ashore at San Pedrillo",
    (7, "photo", 20): "Back across the tidal flats",
    (7, "video", 4): "Walking Uvita's Whale Tail at low tide",
    (7, "photo", 21): "A wave from the Whale Tail",
    (7, "video", 5): "Family selfie on the Whale Tail",
    (7, "photo", 22): "One last selfie at the Whale Tail",
    (7, "photo", 23): "Dressed for dinner above Uvita",
    (7, "photo", 24): "Mother and son at sunset",
    (7, "photo", 25): "Wrapped up at the overlook",
    (7, "photo", 26): "Together above the rainforest",
    (7, "photo", 27): "A sunset kiss above Uvita",
    (7, "photo", 28): "Mother-daughter dinner portrait",
    (7, "photo", 29): "Watching the mist roll through",
    (7, "photo", 30): "One quiet look at the rainforest",
    (7, "photo", 31): "Scarlet macaw close-up",
    (7, "photo", 32): "Firelight after Corcovado",
    (7, "photo", 33): "A nightcap by the fire",
    (7, "photo", 34): "Toasting by the firepit",
    (7, "photo", 35): "Firelight portrait",
    (7, "photo", 36): "An evening by the firepit",
    (7, "photo", 37): "A green visitor after dark",
    (7, "photo", 38): "Leaf wings in perfect camouflage",
    (8, "photo", 1): "Breakfast before Caño Island",
    (8, "photo", 2): "A little history before the boat",
    (8, "photo", 3): "Waiting above the bay",
    (8, "photo", 4): "Ready for the boat",
    (8, "photo", 5): "Caño Island, here we come",
    (8, "photo", 6): "Life jackets on",
    (8, "video", 1): "Riding out across the Pacific",
    (8, "photo", 7): "A toucan overhead",
    (8, "video", 2): "Toucan in the treetops",
    (8, "photo", 8): "Back at the infinity pool",
    (8, "photo", 10): "Poolside peace signs",
    (8, "photo", 11): "Cooling off among the rocks",
    (8, "photo", 12): "Tucked into the waterfall pool",
    (8, "photo", 13): "Evening at the infinity pool",
    (9, "video", 1): "One last look over Vista Celestial",
    (9, "photo", 1): "A quiet morning above Uvita",
    (9, "photo", 2): "Last breakfast by the infinity pool",
    (9, "photo", 3): "Father-son road-trip selfie",
    (9, "photo", 4): "Goodbye to Vista Celestial",
    (9, "photo", 5): "Climbing the Irazú letters",
    (9, "photo", 6): "Taking on Irazú one letter at a time",
    (9, "photo", 7): "At the edge of Irazú's crater",
    (9, "photo", 8): "Welcome to Irazú Volcano",
    (9, "photo", 9): "A heart-shaped stop at the crater",
    (9, "video", 2): "A windy hello from Irazú",
    (9, "photo", 10): "The heart above the crater",
    (9, "photo", 11): "Crater-rim family selfie",
    (9, "photo", 12): "Windblown at the crater",
    (9, "video", 3): "Windy smiles over Irazú",
    (9, "photo", 13): "All four at the crater rim",
    (9, "video", 4): "A family moment above the clouds",
    (9, "photo", 14): "Crater-rim travel partners",
    (9, "photo", 15): "A hug above the clouds",
    (9, "photo", 16): "Cloud-level cuddles",
    (9, "photo", 17): "A crater-rim lift",
    (9, "photo", 18): "Three beneath the Irazú heart",
    (9, "photo", 19): "Driving across the crater floor",
    (9, "video", 5): "Checking the altitude at Irazú",
    (9, "photo", 20): "Cartago below the clouds",
    (9, "photo", 21): "Overlooking Cartago",
    (9, "photo", 22): "Back in the car for the airport",
}
DAY_BY_DATE = {
    "2026-07-31": 1,
    "2026-08-01": 2,
    "2026-08-02": 3,
    "2026-08-03": 4,
    "2026-08-04": 5,
    "2026-08-05": 6,
    "2026-08-06": 7,
    "2026-08-07": 8,
    "2026-08-08": 9,
}
COSTA_RICA = ZoneInfo("America/Costa_Rica")
NAME_TIMESTAMP = re.compile(r"(?:PXL_|dji_fly_)(2026)(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})", re.I)
METADATA_TIMESTAMP = re.compile(rb"(2026):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})")
VIDEO_TIMESTAMP = re.compile(r"(2026)-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})")


class HeifError(Structure):
    _fields_ = [("code", c_int), ("subcode", c_int), ("message", c_char_p)]


def call_heif(function, *args):
    error = function(*args)
    if error.code:
        message = error.message.decode("utf-8", "replace") if error.message else "unknown libheif error"
        raise RuntimeError(message)


def strip_auxiliary_references(source: Path, destination: Path) -> None:
    """Make the primary still readable by the older installed libheif.

    These iPhone files use a large collection of depth and thumbnail auxiliary
    images. libheif 1.12 rejects that collection before it reaches the primary
    image.  The primary image's grid references (``dimg``) stay intact; only
    auxiliary, descriptive, and thumbnail links are marked as free boxes in a
    temporary copy.  No original camera file is modified.
    """

    data = bytearray(source.read_bytes())
    position = 0
    while position + 12 <= len(data):
        size = struct.unpack_from(">I", data, position)[0]
        box_type = bytes(data[position + 4:position + 8])
        if size < 8 or position + size > len(data):
            break
        if box_type == b"meta":
            child = position + 12  # meta has a four-byte full-box header
            meta_end = position + size
            while child + 12 <= meta_end:
                child_size = struct.unpack_from(">I", data, child)[0]
                child_type = bytes(data[child + 4:child + 8])
                if child_size < 8 or child + child_size > meta_end:
                    break
                if child_type == b"iref":
                    reference = child + 12  # iref is also a full box
                    reference_end = child + child_size
                    while reference + 8 <= reference_end:
                        reference_size = struct.unpack_from(">I", data, reference)[0]
                        if reference_size < 8 or reference + reference_size > reference_end:
                            break
                        if bytes(data[reference + 4:reference + 8]) in {b"auxl", b"cdsc", b"thmb"}:
                            data[reference + 4:reference + 8] = b"free"
                        reference += reference_size
                child += child_size
        position += size
    destination.write_bytes(data)


def decode_heic_to_ppm(source: Path, destination: Path) -> None:
    """Decode a HEIC with the installed libheif shared library.

    ImageMagick in this environment advertises HEIC support but cannot decode
    these iPhone files.  Calling libheif directly keeps the conversion local.
    """

    lib = ctypes.CDLL("libheif.so.1")
    lib.heif_context_alloc.restype = c_void_p
    lib.heif_context_read_from_file.restype = HeifError
    lib.heif_context_read_from_file.argtypes = [c_void_p, c_char_p, c_void_p]
    lib.heif_context_get_primary_image_handle.restype = HeifError
    lib.heif_context_get_primary_image_handle.argtypes = [c_void_p, POINTER(c_void_p)]
    lib.heif_decode_image.restype = HeifError
    lib.heif_decode_image.argtypes = [c_void_p, POINTER(c_void_p), c_int, c_int, c_void_p]
    lib.heif_image_get_plane_readonly.restype = POINTER(c_ubyte)
    lib.heif_image_get_plane_readonly.argtypes = [c_void_p, c_int, POINTER(c_int)]
    lib.heif_image_handle_get_width.argtypes = [c_void_p]
    lib.heif_image_handle_get_width.restype = c_int
    lib.heif_image_handle_get_height.argtypes = [c_void_p]
    lib.heif_image_handle_get_height.restype = c_int
    lib.heif_context_free.argtypes = [c_void_p]
    lib.heif_image_handle_release.argtypes = [c_void_p]
    lib.heif_image_release.argtypes = [c_void_p]

    sanitized = destination.with_suffix(".heic")
    strip_auxiliary_references(source, sanitized)
    context = lib.heif_context_alloc()
    handle = c_void_p()
    image = c_void_p()
    try:
        call_heif(lib.heif_context_read_from_file, context, str(sanitized).encode(), None)
        call_heif(lib.heif_context_get_primary_image_handle, context, byref(handle))
        width = lib.heif_image_handle_get_width(handle)
        height = lib.heif_image_handle_get_height(handle)
        # heif_colorspace_RGB = 1, heif_chroma_interleaved_RGB = 10
        call_heif(lib.heif_decode_image, handle, byref(image), 1, 10, None)
        stride = c_int()
        # heif_channel_interleaved = 10
        pixels = lib.heif_image_get_plane_readonly(image, 10, byref(stride))
        if not pixels:
            raise RuntimeError("libheif returned no RGB pixel data")
        start = ctypes.addressof(pixels.contents)
        with destination.open("wb") as ppm:
            ppm.write(f"P6\n{width} {height}\n255\n".encode())
            for row in range(height):
                ppm.write(ctypes.string_at(start + row * stride.value, width * 3))
    finally:
        if image:
            lib.heif_image_release(image)
        if handle:
            lib.heif_image_handle_release(handle)
        if context:
            lib.heif_context_free(context)
        sanitized.unlink(missing_ok=True)


def captured_at(path: Path) -> datetime:
    if path.suffix.lower() in IMAGE_SUFFIXES:
        # Camera metadata records the local capture time. Pixel file names use
        # UTC, so they are deliberately only a fallback below.
        match = METADATA_TIMESTAMP.search(path.read_bytes())
        if match:
            return datetime(*map(int, match.groups()))

    if path.suffix.lower() in {".mp4", ".mov"}:
        # DJI names are local time; its container creation time is UTC.
        name_match = NAME_TIMESTAMP.search(path.name)
        if name_match and path.name.lower().startswith("dji_fly_"):
            return datetime(*map(int, name_match.groups()))
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format_tags=creation_time", "-of", "default=noprint_wrappers=1", str(path)],
            check=True,
            capture_output=True,
            text=True,
        )
        match = VIDEO_TIMESTAMP.search(result.stdout)
        if match:
            utc_time = datetime(*map(int, match.groups()), tzinfo=ZoneInfo("UTC"))
            return utc_time.astimezone(COSTA_RICA).replace(tzinfo=None)

    name_match = NAME_TIMESTAMP.search(path.name)
    if name_match:
        return datetime(*map(int, name_match.groups()))
    raise ValueError(f"Could not find a 2026 capture timestamp in {path.name}")


def source_files() -> list[Path]:
    files = []
    for path in ORIGINALS.rglob("*"):
        if path.is_file() and path.suffix.lower() in MEDIA_SUFFIXES:
            files.append(path)
    return files


def optimize_jpeg(source: Path, destination: Path) -> None:
    subprocess.run(
        [
            "convert", str(source), "-auto-orient", "-resize", "1800x1800>",
            "-strip", "-interlace", "Plane", "-quality", "82", str(destination),
        ],
        check=True,
    )


def optimize_heic(source: Path, destination: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="costarica-heic-") as temporary:
        ppm = Path(temporary) / "source.ppm"
        decode_heic_to_ppm(source, ppm)
        optimize_jpeg(ppm, destination)


def optimize_video(source: Path, destination: Path) -> None:
    """Convert camera video to a compact MP4 that can start streaming quickly."""

    temporary = destination.with_suffix(".partial.mp4")
    temporary.unlink(missing_ok=True)
    try:
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ignore_unknown", "-i", str(source), "-map", "0:v:0", "-map", "0:a:0?",
                "-vf", "scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2",
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "27",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(temporary),
            ],
            check=True,
        )
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def optimize_thumbnail(source: Path, destination: Path, is_video: bool) -> None:
    """Create a small 4:3 poster used by the on-page carousel."""

    temporary = destination.with_suffix(".partial.jpg")
    temporary.unlink(missing_ok=True)
    try:
        if is_video:
            subprocess.run(
                [
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", "0.1", "-i", str(source), "-frames:v", "1",
                    "-vf", "scale=640:480:force_original_aspect_ratio=increase,crop=640:480",
                    "-q:v", "4", str(temporary),
                ],
                check=True,
            )
        else:
            subprocess.run(
                [
                    "convert", str(source), "-auto-orient", "-thumbnail", f"{THUMB_SIZE}^",
                    "-gravity", "center", "-extent", THUMB_SIZE, "-strip", "-interlace", "Plane",
                    "-quality", "76", str(temporary),
                ],
                check=True,
            )
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def public_url(path: Path) -> str:
    return f"{PUBLIC_MEDIA_ROOT}/{path.relative_to(WEB).as_posix()}"


def day_label(day: int) -> str:
    date = next(date for date, mapped_day in DAY_BY_DATE.items() if mapped_day == day)
    return datetime.strptime(date, "%Y-%m-%d").strftime("%-d %B")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenerate existing web images")
    parser.add_argument("--reset-web", action="store_true", help="remove generated web images before rebuilding them")
    parser.add_argument("--day", type=int, choices=range(1, 10), help="only generate derivatives for one day")
    parser.add_argument("--video", type=int, help="only generate one video's ordinal position within the selected day")
    args = parser.parse_args()

    if args.reset_web:
        for day_dir in WEB.glob("day-*"):
            if day_dir.is_dir():
                shutil.rmtree(day_dir)
        shutil.rmtree(WEB / "videos", ignore_errors=True)
        shutil.rmtree(WEB / "thumbs", ignore_errors=True)
        (WEB / "photos.js").unlink(missing_ok=True)

    records = []
    for path in source_files():
        taken = captured_at(path)
        date = taken.strftime("%Y-%m-%d")
        if date not in DAY_BY_DATE:
            raise ValueError(f"{path.name} was captured outside the trip dates: {date}")
        records.append((taken, path, DAY_BY_DATE[date]))
    records.sort(key=lambda record: (record[2], record[0], record[1].name.lower()))

    # Move top-level extracted originals into their day folders exactly once.
    organized = []
    for taken, path, day in records:
        day_dir = ORIGINALS / f"day-{day:02d}"
        day_dir.mkdir(exist_ok=True)
        if path.parent != day_dir:
            destination = day_dir / path.name
            if destination.exists():
                raise FileExistsError(f"Refusing to overwrite {destination}")
            shutil.move(path, destination)
            path = destination
        organized.append((taken, path, day))

    photos_by_day: dict[int, list[dict[str, str]]] = {day: [] for day in range(1, 10)}
    for day in range(1, 10):
        media = [(taken, path) for taken, path, record_day in organized if record_day == day]
        photo_number = 0
        video_number = 0
        for taken, path in media:
            is_video = path.suffix.lower() in VIDEO_SUFFIXES
            if is_video:
                video_number += 1
                output = WEB / "videos" / f"day-{day:02d}" / f"{video_number:03d}.mp4"
                thumbnail = WEB / "thumbs" / "videos" / f"day-{day:02d}" / f"{video_number:03d}.jpg"
                caption = f"Video {video_number}"
            else:
                photo_number += 1
                output = WEB / f"day-{day:02d}" / f"{photo_number:03d}.jpg"
                thumbnail = WEB / "thumbs" / f"day-{day:02d}" / f"{photo_number:03d}.jpg"
                caption = f"Photo {photo_number}"
            media_key = (day, "video" if is_video else "photo", video_number if is_video else photo_number)
            caption = MEDIA_CAPTIONS.get(media_key, caption)
            requested_video = args.video is None or (is_video and video_number == args.video)
            if args.day in (None, day) and requested_video and (args.force or not output.exists()):
                output.parent.mkdir(parents=True, exist_ok=True)
                print(f"Optimizing {path.name} -> {output.relative_to(ROOT)}")
                if is_video:
                    optimize_video(path, output)
                elif path.suffix.lower() == ".heic":
                    optimize_heic(path, output)
                else:
                    optimize_jpeg(path, output)
            if args.day in (None, day) and requested_video and output.exists() and (args.force or not thumbnail.exists()):
                thumbnail.parent.mkdir(parents=True, exist_ok=True)
                print(f"Thumbnailing {output.relative_to(ROOT)} -> {thumbnail.relative_to(ROOT)}")
                optimize_thumbnail(output, thumbnail, is_video)
            if media_key not in EXCLUDED_MEDIA:
                photos_by_day[day].append(
                    {
                        "src": public_url(output),
                        "thumb": public_url(thumbnail),
                        **({"type": "video"} if is_video else {}),
                        "caption": caption,
                        "place": f"{day_label(day)} · {taken.strftime('%-I:%M %p')}",
                    }
                )

    manifest = "/* Generated by scripts/process_media.py — do not edit by hand. */\n"
    manifest += "window.TRIP_PHOTOS = " + json.dumps(photos_by_day, indent=2) + ";\n"
    (WEB / "photos.js").write_text(manifest)
    totals = ", ".join(f"day {day}: {len(items)}" for day, items in photos_by_day.items())
    print(f"Built {sum(map(len, photos_by_day.values()))} web photos ({totals}).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
