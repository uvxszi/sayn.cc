#!/usr/bin/env bash

# Makes the preview and the smaller download sizes of every gallery image (needs ImageMagick),
# and records their dimensions in sizes.ndjson for scripts/build.js. Run before the build on GitHub.

set -euo pipefail

ORIGINALS="assets/gallery/originals"
GENERATED="assets/gallery/generated"

rm -rf "$GENERATED"
mkdir -p "$GENERATED"

# One line of JSON per image.
MANIFEST="$GENERATED/sizes.ndjson"

: > "$MANIFEST"

if command -v magick >/dev/null 2>&1; then
    IM="magick"
    IDENTIFY="magick identify"
else
    IM="convert"
    IDENTIFY="identify"
fi

file_size_mb() {
    local bytes
    bytes=$(stat -c%s "$1")
    awk -v bytes="$bytes" 'BEGIN { printf "%.2f", bytes / 1000000 }'
}

find "$ORIGINALS" -maxdepth 1 -type f \
    \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) \
    -print0 |
while IFS= read -r -d '' src; do

    filename="$(basename "$src")"
    name="${filename%.*}"

    width="$($IDENTIFY -format '%w' "$src")"
    height="$($IDENTIFY -format '%h' "$src")"

    echo "Processing $filename (${width}x${height})"

    # Small gallery preview. Never upscale.
    "$IM" "$src" \
        -auto-orient \
        -resize '900x900>' \
        -quality 82 \
        "$GENERATED/${name}-preview.webp"

    preview_width="$($IDENTIFY -format '%w' "$GENERATED/${name}-preview.webp")"
    preview_height="$($IDENTIFY -format '%h' "$GENERATED/${name}-preview.webp")"

    has_1920=false
    has_2560=false

    size_1920=""
    width_1920=""
    height_1920=""

    size_2560=""
    width_2560=""
    height_2560=""

    # 1920 maximum dimension version
    if [ "$width" -gt 1920 ] || [ "$height" -gt 1920 ]; then
        "$IM" "$src" \
            -auto-orient \
            -resize '1920x1920>' \
            "$GENERATED/${name}-1920.png"

        has_1920=true
        size_1920="$(file_size_mb "$GENERATED/${name}-1920.png")"
        width_1920="$($IDENTIFY -format '%w' "$GENERATED/${name}-1920.png")"
        height_1920="$($IDENTIFY -format '%h' "$GENERATED/${name}-1920.png")"
    fi

    # 2560 maximum dimension version
    if [ "$width" -gt 2560 ] || [ "$height" -gt 2560 ]; then
        "$IM" "$src" \
            -auto-orient \
            -resize '2560x2560>' \
            "$GENERATED/${name}-2560.png"

        has_2560=true
        size_2560="$(file_size_mb "$GENERATED/${name}-2560.png")"
        width_2560="$($IDENTIFY -format '%w' "$GENERATED/${name}-2560.png")"
        height_2560="$($IDENTIFY -format '%h' "$GENERATED/${name}-2560.png")"
    fi

    printf '{"id":"%s","width":%s,"height":%s,"preview_width":%s,"preview_height":%s,"has_1920":%s,"width_1920":"%s","height_1920":"%s","size_1920_mb":"%s","has_2560":%s,"width_2560":"%s","height_2560":"%s","size_2560_mb":"%s"}\n' \
        "$name" "$width" "$height" "$preview_width" "$preview_height" \
        "$has_1920" "$width_1920" "$height_1920" "$size_1920" \
        "$has_2560" "$width_2560" "$height_2560" "$size_2560" \
        >> "$MANIFEST"

done

echo "Gallery image processing complete."