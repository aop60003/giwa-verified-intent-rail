#!/usr/bin/env bash
set -euo pipefail

umask 022

node_version="v22.16.0"
archive_name="node-v22.16.0-linux-x64.tar.xz"
expected_sha256="f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e"
origin="https://nodejs.org/dist/v22.16.0"
runtime_parent="/opt/giwa/runtime"
final_path="/opt/giwa/runtime/node-v22.16.0"
temp_dir=""

cleanup() {
  status=$?
  trap - EXIT
  if [ -n "$temp_dir" ]; then
    case "$temp_dir" in
      "$runtime_parent"/.node-"$node_version"-????????)
        rm -rf -- "$temp_dir"
        ;;
      *)
        printf '%s\n' "isolated node cleanup refused" >&2
        status=1
        ;;
    esac
  fi
  exit "$status"
}
trap cleanup EXIT

[ "$(id -u)" -eq 0 ]
[ "$(uname -s)" = "Linux" ]
[ "$(uname -m)" = "x86_64" ]

for command_name in curl tar sha256sum mktemp xz; do
  command -v "$command_name" >/dev/null 2>&1
done

[ -d "$runtime_parent" ]
[ ! -L "$runtime_parent" ]

if [ -e "$final_path" ] || [ -L "$final_path" ]; then
  [ -d "$final_path" ]
  [ ! -L "$final_path" ]
  [ "$("$final_path/bin/node" --version)" = "$node_version" ]
  printf 'isolated-node %s ready\n' "$node_version"
  exit 0
fi

temp_dir="$(mktemp -d "$runtime_parent/.node-$node_version-XXXXXXXX")"
case "$temp_dir" in
  "$runtime_parent"/.node-"$node_version"-????????) ;;
  *) exit 1 ;;
esac

archive_path="$temp_dir/$archive_name"
manifest_path="$temp_dir/SHASUMS256.txt"
expected_manifest_line="$expected_sha256  $archive_name"

curl --fail --silent --show-error --location \
  --proto '=https' --tlsv1.2 \
  "$origin/SHASUMS256.txt" \
  --output "$manifest_path"
curl --fail --silent --show-error --location \
  --proto '=https' --tlsv1.2 \
  "$origin/$archive_name" \
  --output "$archive_path"

[ "$(grep -Fxc "$expected_manifest_line" "$manifest_path")" -eq 1 ]
(
  cd "$temp_dir"
  printf '%s  %s\n' "$expected_sha256" "$archive_name" |
    sha256sum --check --status
)

tar -xJf "$archive_path" -C "$temp_dir"
candidate_path="$temp_dir/node-$node_version-linux-x64"
[ -d "$candidate_path" ]
[ ! -L "$candidate_path" ]
[ "$("$candidate_path/bin/node" --version)" = "$node_version" ]

chown -R root:root "$candidate_path"
chmod -R go-w "$candidate_path"
mv -T --no-clobber "$candidate_path" "$final_path"
[ ! -e "$candidate_path" ]
[ -d "$final_path" ]
[ ! -L "$final_path" ]
[ "$("$final_path/bin/node" --version)" = "$node_version" ]

printf 'isolated-node %s ready\n' "$node_version"
