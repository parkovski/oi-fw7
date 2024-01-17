if [ "$1" != "-y" ]; then
  echo "Generate first:"
  echo "- resources/oi-logo.svg"
  echo "- resources/splash.svg"
  echo "- assets-src/apple-touch-icon.png (256x256)"
  echo "Then run export-icons -y"
  exit
fi

echo "Generate icons..."
inkscape -o "../../resources/icon.png" -w 1024 -h 1024 oi-logo.svg
inkscape -o "../../resources/splash.png" -w 2732 -h 2732 splash.svg
inkscape -o "../../assets-src/web-icon.png" -w 512 -h 512 oi-logo.svg
echo "Not generated: ../../assets-src/apple-touch-icon.png (256x256)"
inkscape -o "../../public/icons/favicon.png" -w 128 -h 128 oi-logo.svg
inkscape -o "../../public/icons/128x128.png" -w 128 -h 128 oi-logo.svg
inkscape -o "../../public/icons/144x144.png" -w 144 -h 144 oi-logo.svg
inkscape -o "../../public/icons/152x152.png" -w 152 -h 152 oi-logo.svg
inkscape -o "../../public/icons/192x192.png" -w 192 -h 192 oi-logo.svg
inkscape -o "../../public/icons/256x256.png" -w 256 -h 256 oi-logo.svg
inkscape -o "../../public/icons/512x512.png" -w 512 -h 512 oi-logo.svg
echo "Copy assets-src/apple-touch-icon.png to public/icons..."
cp ../../assets-src/apple-touch-icon.png ../../public/icons/apple-touch-icon.png
