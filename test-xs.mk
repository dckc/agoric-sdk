export WORKSPACE=.
TAPE=~/projects/agoric/tape-xs

LIB=$(WORKSPACE)/packages/cosmic-swingset/lib
XS_NPM=$(LIB)/xs-npm

TEST_SCRIPTS=packages/eventual-send/test/test*.js packages/marshal/test/test*.js packages/captp/test/*.js

test: build/bin/lin/release/agoric-sdk
	./build/bin/lin/release/agoric-sdk

MANIFEST=test-xs-manifest.json

build/bin/lin/release/agoric-sdk: build $(MANIFEST) xs-compartments.json test-xs-main.js $(XS_NPM)/tape-promise
	mcconfig -o build -p x-cli-lin -m $(MANIFEST)

build/bin/lin/debug/agoric-sdk: build $(MANIFEST) xs-compartments.json test-xs-main.js $(XS_NPM)/tape-promise
	mcconfig -o build -d -p x-cli-lin -m $(MANIFEST)

# run in simulator and xsbug
xsbug: build xs-compartments.json test-xs-main.js $(XS_NPM)/tape-promise
	mcconfig -o build -d -m $(MANIFEST)

build:
	mkdir -p build


$(XS_NPM)/tape-promise: $(XS_NPM)/tape.js
	ln -s $(TAPE)/src $(XS_NPM)/tape-promise

$(XS_NPM)/tape.js:
	ln -s $(TAPE)/src/tape.js $(XS_NPM)/tape.js

xs-compartments.json: $(TEST_SCRIPTS) $(TAPE)/bin/modlinks.js $(XS_NPM)/tape-promise
	XS_NPM=$(LIB)/xs-npm XS_NODE_API=$(LIB)/xs-node-api \
		node -r esm $(TAPE)/bin/modlinks.js $(WORKSPACE) $(TEST_SCRIPTS)


clean:
	rm -rf build

realclean: clean
	rm -f xs-compartments.json
