# export WORKSPACE=../../..
# TAPE=~/projects/agoric/tape-xs

BUILD_BUNDLE=node -r esm ../scripts/build-bundle.js

LIB=$(WORKSPACE)/packages/cosmic-swingset/lib
XS_NPM=$(LIB)/xs-npm

TEST_SCRIPTS=test*.js */test*.js

SOURCES=$(TEST_SCRIPTS) $(XS_NPM)/*.js $(XS_NPM)/@agoric/*.js ../src/*.js $(LIB)/xs-node-global/*.js

test: build/bin/lin/release/test bundled-vats ./demo
	./build/bin/lin/release/test

# ISSUE: how does node find demo/encouragementBotComms from here?
./demo:
	ln -s ../demo

MANIFEST=manifest.json

build/bin/lin/release/test: build $(MANIFEST) xs-compartments.json xs-main.js $(SOURCES) \
		$(XS_NPM)/tape-promise $(XS_NPM)/tape.js genesis-bundles
	mcconfig -o build -p x-cli-lin -m $(MANIFEST)

build/bin/lin/debug/test: build $(MANIFEST) xs-compartments.json xs-main.js $(SOURCES) \
		$(XS_NPM)/tape-promise $(XS_NPM)/tape.js genesis-bundles
	mcconfig -o build -d -p x-cli-lin -m $(MANIFEST)

# run in simulator and xsbug
xsbug: build xs-compartments.json xs-main.js $(XS_NPM)/tape-promise
	mcconfig -o build -d -m $(MANIFEST)

build:
	mkdir -p build


$(XS_NPM)/tape-promise: $(XS_NPM)/tape.js
	ln -s $(TAPE)/src $(XS_NPM)/tape-promise

$(XS_NPM)/tape.js:
	ln -s $(TAPE)/src/tape.js $(XS_NPM)/tape.js

xs-compartments.json: manifest.json
	XS_NPM=$(LIB)/xs-npm XS_NODE_API=$(LIB)/xs-node-api \
		node -r esm $(TAPE)/bin/modlinks.js $(WORKSPACE) $(TEST_SCRIPTS)

# bundle all the test vats
bundled-vats: vat_controller-1-src.js

vat_controller-1-src.js:
	find .. -type f -name src -prune -o -name 'bootstrap.js' | while read mod; do \
		bundle=`echo $$mod | perl -pe 's/bootstrap.js/bootstrap-src.js/'`; \
		$(BUILD_BUNDLE) $$mod $$bundle; \
		done
	find .. -type f -name src -prune -o -name 'vat-*' | while read mod; do \
		bundle=`echo $$mod | perl -pe 's/vat-([a-zA-Z0-9-]+)(.js)?/vat_$$1-src.js/'`; \
		$(BUILD_BUNDLE) $$mod $$bundle; \
		done

genesis-bundles: ../src/bundles/kernel.js

../src/bundles/kernel.js: ../src/kernel/index.js
	$(BUILD_BUNDLE) ../src/kernel/index.js ../src/bundles/kernel.js
	$(BUILD_BUNDLE) ../src/devices/mailbox-src.js ../src/bundles/mailbox-src.js
	$(BUILD_BUNDLE) ../src/devices/command-src.js ../src/bundles/command-src.js
	$(BUILD_BUNDLE) ../src/devices/timer-src.js ../src/bundles/timer-src.js
	$(BUILD_BUNDLE) ../src/devices/loopbox-src.js ../src/bundles/loopbox-src.js
	$(BUILD_BUNDLE) ../src/vats/comms/index.js ../src/bundles/vat_comms-src.js
	$(BUILD_BUNDLE) ../src/vats/vat-timerWrapper.js ../src/bundles/vat_timerWrapper-src.js
	$(BUILD_BUNDLE) ../src/vats/vat-tp.js ../src/bundles/vat_vattp-src.js


clean:
	rm -rf build
	find .. -name bootstrap-src.js -o -name 'vat_*-src.js' | xargs rm -f
	rm -rf ../src/bundles/*.js

realclean: clean
	rm -f xs-compartments.json
