all: install lint build

# Check source for style and syntax errors
lint:
	npx eslint --ext mjs,js .

# Generate build targets using Rollup
build:
	npx rollup -c

# Nuke build artefacts
clean:
	rm -f bin/*.js
	rm -f lib/index.js*

# TODO: Remove the following hack once a new version is published
utils = node_modules/alhadis.utils/index.mjs
$(utils):
	[ -d ~/Labs/Utils ] || exit
	rm -rf "$(@D)"
	ln -fs ~/Labs/Utils "$(@D)"

# Install missing dependencies
install: node_modules $(utils)
node_modules:
	mkdir $@
	npm install --no-save --no-package-lock .

.PHONY: build clean lint
