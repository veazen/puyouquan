#!/bin/sh
# 用法: SETUP=guitar OUT=... sh ed/shot.sh
D=$(cd "$(dirname "$0")" && pwd)
cat $D/skin.css ${EXTRA_CSS:-} > $D/_inject.css
NODE_PATH=$(npm root -g) U=$D PROPOSAL=1 node $D/editor-shot.js
