#!/usr/bin/env bash

project=$(realpath .)

for f in $(find $project/elm/src/Pages -type f -print); do
	file=$(realpath $f)
	name=$(basename $file .elm | awk '{print tolower($0)}')
	(
		cd ./elm
		elm make $file --output=$project/static/scripts/$name.js
	)
done
