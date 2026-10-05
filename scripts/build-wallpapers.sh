#!/usr/bin/env bash

set -euo pipefail

ORIGINALS="assets/wallpapers/originals"
GENERATED="assets/wallpapers/generated"
DATA="_data"

mkdir -p "$GENERATED"
mkdir -p "$DATA"

MANIFEST="$DATA/wallpaper_sizes.yml"

echo "# Generated automatically. Do not edit." > "$MANIFEST"

if command -v magick >/dev/null 2>&1; then
    IM="magick"
    IDENTIFY="magick identify"
else
    IM="convert"
    IDENTIFY="identify"
fi

# Convert bytes to decimal MB, e.g. 618492 -> 0.62
file_size_mb() {
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

    # Gallery preview
    "$IM" "$src" \
        -auto-orient \
        -resize '960x960>' \
        -quality 80 \
        "$GENERATED/${name}-preview.webp"

    has_1920=false
    has_2560=false

    size_1920=""
    size_2560=""

    # Only create a 1920-class version if either dimension exceeds 1920.
    if [ "$width" -gt 1920 ] || [ "$height" -gt 1920 ]; then
        "$IM" "$src" \
            -auto-orient \
            -resize '1920x1920>' \
            "$GENERATED/${name}-1920.png"

        has_1920=true
        size_1920="$(file_size_mb "$GENERATED/${name}-1920.png")"
    fi

    # Only create a 2560-class version if either dimension exceeds 2560.
    if [ "$width" -gt 2560 ] || [ "$height" -gt 2560 ]; then
        "$IM" "$src" \
            -auto-orient \
            -resize '2560x2560>' \
            "$GENERATED/${name}-2560.png"

        has_2560=true
        size_2560="$(file_size_mb "$GENERATED/${name}-2560.png")"
    fi

    original_size="$(file_size_mb "$src")"

    cat >> "$MANIFEST" <<EOF
${name}:
  width: ${width}
  height: ${height}
  original_size_mb: "${original_size}"
  has_1920: ${has_1920}
  size_1920_mb: "${size_1920}"
  has_2560: ${has_2560}
  size_2560_mb: "${size_2560}"
EOF

done

echo "Wallpaper processing complete."
