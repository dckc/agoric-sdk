# see also .envrc
# WORKSPACE=../../..
# TAPE=~/projects/agoric/tape-xs

MANIFEST=manifest.json

TEST_SCRIPTS=test*.js */test*.js

test: build/bin/lin/release/test
	./build/bin/lin/release/test

build/bin/lin/release/test: build xs-compartments.json $(MANIFEST) xs-main.js
	mcconfig -o build -p x-cli-lin -m $(MANIFEST)

LIB=../../cosmic-swingset/lib

xs-compartments.json:
	XS_NPM=$(LIB)/xs-npm XS_NODE_API=$(LIB)/xs-node-api \
		node -r esm $(TAPE)/bin/modlinks.js $(WORKSPACE) $(TEST_SCRIPTS)

build:
	mkdir -p build

clean:
	rm -rf build
