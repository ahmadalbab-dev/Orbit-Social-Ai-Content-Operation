#!/usr/bin/env bash
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  # The hosted runner's regional HTTP mirror stalled in two acceptance runs.
  # Scope this install to Ubuntu's signed HTTPS archive, without rewriting the
  # runner's configured sources or contacting unrelated vendor repositories.
  source /etc/os-release
  [[ "$ID" == ubuntu && -n "${VERSION_CODENAME:-}" ]]
  codec_sources="${RUNNER_TEMP:?GitHub runner temp directory required}/orbit-codecs.sources"
  cat > "$codec_sources" <<EOF
Types: deb
URIs: https://archive.ubuntu.com/ubuntu
Suites: ${VERSION_CODENAME} ${VERSION_CODENAME}-updates ${VERSION_CODENAME}-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
  apt_options=(-o "Dir::Etc::sourcelist=$codec_sources" -o 'Dir::Etc::sourceparts=-'
    -o APT::Get::List-Cleanup=0 -o Acquire::Retries=2
    -o Acquire::https::Timeout=30 -o Acquire::http::Timeout=30)
  sudo apt-get "${apt_options[@]}" -o APT::Update::Error-Mode=any update
  sudo apt-get "${apt_options[@]}" install -y --no-install-recommends ffmpeg
fi

ffmpeg -version
ffprobe -version
