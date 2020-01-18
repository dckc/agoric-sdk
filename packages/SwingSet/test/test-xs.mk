export WORKSPACE=../../..
TAPE=~/projects/agoric/tape-xs

BUILD_BUNDLE=../scripts/build-bundle.js

LIB=$(WORKSPACE)/packages/cosmic-swingset/lib
XS_NPM=$(LIB)/xs-npm

# TEST_SCRIPTS=test*.js
TEST_SCRIPTS=test-controller.js
SOURCES=$(TEST_SCRIPTS) $(XS_NPM)/*.js $(XS_NPM)/@agoric/*.js ../src/*.js $(LIB)/xs-node-global/*.js

test: build/bin/lin/release/test bundled-vats
	./build/bin/lin/release/test

MANIFEST=manifest.json

build/bin/lin/release/test: build $(MANIFEST) xs-compartments.json xs-main.js $(SOURCES)
	mcconfig -o build -p x-cli-lin -m $(MANIFEST)

build/bin/lin/debug/test: build $(MANIFEST) xs-compartments.json xs-main.js $(SOURCES)
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

xs-compartments.json: $(TEST_SCRIPTS) $(TAPE)/bin/modlinks.js $(XS_NPM)/tape-promise
	XS_NPM=$(LIB)/xs-npm XS_NODE_API=$(LIB)/xs-node-api \
		node -r esm $(TAPE)/bin/modlinks.js $(WORKSPACE) $(TEST_SCRIPTS)

# bundle all the test vats
bundled-vats: vat_controller-1-src.js basedir-controller-2 basedir-controller-3

./vat_controller-1-src.js: ./vat-controller-1
	node -r esm $(BUILD_BUNDLE) $< $@

basedir-controller-2: ./basedir-controller-2/bootstrap-src.js \
	./basedir-controller-2/vat_left-src.js ./basedir-controller-2/vat_right-src.js
./basedir-controller-2/bootstrap-src.js: ./basedir-controller-2/bootstrap.js
	node -r esm $(BUILD_BUNDLE) $< $@
./basedir-controller-2/vat_left-src.js: ./basedir-controller-2/vat-left.js
	node -r esm $(BUILD_BUNDLE) $< $@
./basedir-controller-2/vat_right-src.js: ./basedir-controller-2/vat-right.js
	node -r esm $(BUILD_BUNDLE) $< $@

basedir-controller-3: ./basedir-controller-3/bootstrap-src.js \
	./basedir-controller-3/vat_left-src.js ./basedir-controller-3/vat_right-src.js
./basedir-controller-3/bootstrap-src.js: ./basedir-controller-3/bootstrap.js
	node -r esm $(BUILD_BUNDLE) $< $@
./basedir-controller-3/vat_left-src.js: ./basedir-controller-3/vat-left.js
	node -r esm $(BUILD_BUNDLE) $< $@
./basedir-controller-3/vat_right-src.js: ./basedir-controller-3/vat-right.js
	node -r esm $(BUILD_BUNDLE) $< $@

clean:
	rm -rf build

realclean: clean
	rm -f xs-compartments.json
