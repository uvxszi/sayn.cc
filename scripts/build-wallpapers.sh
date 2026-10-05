#!/usr/bin/env bash

set -euo pipefail

ORIGINALS="assets/wallpapers/originals"
GENERATED="assets/wallpapers/generated"

mkdir -p "$GENERATED"

if command -v magick >/dev/null 2>&1; then
    IM="magick"
else
    IM="convert"
fi

find "$ORIGINALS" -maxdepth 1 -type f \
    \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) \
    -print0 |
while IFS= read -r -d '' src; do

    filename="$(basename "$src")"
    name="${filename%.*}"

    echo "Processing $filename"

    # Small, efficient gallery preview.
    "$IM" "$src" \
        -auto-orient \
        -resize '960x960>' \
        -quality 80 \
        "$GENERATED/${name}-preview.webp"

    # Smaller downloadable version.
    # 4K landscape becomes 1920x1080.
    # 4K portrait becomes 1080x1920.
    "$IM" "$src" \
        -auto-orient \
        -resize '1920x1920>' \
        "$GENERATED/${name}-1920.png"

    # Medium downloadable version.
    # 4K landscape becomes 2560x1440.
    # 4K portrait becomes 1440x2560.
    "$IM" "$src" \
        -auto-orient \
        -resize '2560x2560>' \
        "$GENERATED/${name}-2560.png"

done

echo "Wallpaper processing complete."
