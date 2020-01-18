# export MODDABLE := $(HOME)/projects/moddable
# export WORKSPACE=~/projects/agoric/agoric-sdk
# TAPE_XS=~/projects/agoric/tape-xs
export PATH := $(MODDABLE)/build/bin/lin/release:$(PATH)

PKG=ag-solo

BASEDIR=t3
SOURCES=bin/ag-solo-xs.js lib/ag-solo/*.js lib/xs-npm/*.js lib/xs-npm/@agoric/*.js lib/xs-node-global/*.js lib/xs-node-api/*.js
BUILD=./build

./bin/ag-solo-xs: $(BUILD)/bin/lin/release/ag-solo
	cp $< $@

check-start: ./bin/ag-solo-xs
	cd $(BASEDIR) && ../bin/ag-solo-xs start --role=three_client

$(BUILD)/bin/lin/release/ag-solo: $(SOURCES) ../SwingSet/src/bundles/mailbox-src.js $(BASEDIR)/vats/bootstrap-src.js lib/ag-solo/manifest.json lib/ag-solo/xs-compartments.json
	mkdir -p $(BUILD)
	cd lib/ag-solo; mcconfig -o ../../build -m -p x-cli-lin manifest.json

# run in simulator and xsbug
debug-lite: ../SwingSet/src/bundles/mailbox-src.js $(BASEDIR)/vats/bootstrap-src.js lib/ag-solo/xs-compartments.json
	mkdir -p $(BUILD)
	cd lib/ag-solo; mcconfig -o ../../build -d -m manifest.json

lib/ag-solo/xs-compartments.json: lib/ag-solo/manifest.json
	cd lib/ag-solo; XS_NPM=../xs-npm XS_NODE_API=../xs-node-api node -r esm $(TAPE_XS)/bin/modlinks.js $(WORKSPACE) main.js

### rest of the makefile is not recently tested

$(BASEDIR) $(BASEDIR)/vats/bootstrap.js:
	make scenario3-setup

# bundle all the vats in t3/vats
$(BASEDIR)/vats/bootstrap-src.js: $(BASEDIR)/vats/bootstrap.js
	cd $(BASEDIR)/vats && node -r esm ../../../SwingSet/scripts/build-bundle.js bootstrap.js bootstrap-src.js
	cd $(BASEDIR)/vats && for vat in vat-*.js; do \
		bundle=`echo $$vat | perl -pe 's/vat-([a-z]+).js/vat_$$1-src.js/'`; \
		echo $$vat '->' $$bundle; \
		node -r esm ../../../SwingSet/scripts/build-bundle.js $$vat $$bundle; \
		done

vat-device-bundles: ../SwingSet/src/bundles/mailbox-src.js

../SwingSet/src/bundles/mailbox-src.js:
	cd ../SwingSet && node -r esm scripts/build-bundle.js

./lib/xs-compartments.json: ./lib/*.js ./lib/*/*.js
	cd lib; XS_NPM=xs-npm XS_NODE_API=xs-node-api node -r esm $(TAPE_XS)/bin/modlinks.js $(WORKSPACE) ag-solo/main.js

clean:
	-rm -f ./lib/ag-solo/xs-compartments.json
	-rm -f ./test/xs-compartments.json
	-rm -rf ./bin/ag-solo-xs
	-rm -rf $(BASEDIR)
	-rm -f $(BUILD)/bin/lin/release/$(PKG)
	-rm -f $(BUILD)/bin/lin/debug/$(PKG)
	-rm -rf $(BUILD)/tmp/lin/release/$(PKG)
	-rm -rf $(BUILD)/tmp/lin/debug/$(PKG)
	-rm -rf $(BUILD)/tmp/lin/debug/mc/$(PKG)
