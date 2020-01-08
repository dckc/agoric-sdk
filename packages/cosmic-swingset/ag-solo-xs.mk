export MODDABLE := $(HOME)/projects/moddable
export PATH := $(MODDABLE)/build/bin/lin/release:$(PATH)
WORKSPACE=~/projects/agoric/agoric-sdk
TAPE_XS=~/projects/agoric/tape-xs

PKG=cosmic-swingset

BASEDIR=t3

./bin/ag-solo-xs: $(MODDABLE)/build/bin/lin/release/cosmic-swingset
	cp $(MODDABLE)/build/bin/lin/release/cosmic-swingset $@

check-start: ./bin/ag-solo-xs
	cd $(BASEDIR) && ../bin/ag-solo-xs start --role=three_client

$(MODDABLE)/build/bin/lin/release/cosmic-swingset: ./bin/ag-solo-xs.js lib/ag-solo/*.js lib/xs-npm/*.js lib/xs-node-global/*.js lib/xs-node-api/*.js lib/ag-solo-todo/*.js ../SwingSet/src/bundles/mailbox-src.js $(BASEDIR)/vats/bootstrap-src.js ag-solo-xs-manifest.json
	mcconfig -m -p x-cli-lin ag-solo-xs-manifest.json

# run in simulator and xsbug
debug-lite: ../SwingSet/src/bundles/mailbox-src.js $(BASEDIR)/vats/bootstrap-src.js
	mcconfig -d -p lin -m ag-solo-xs-manifest.json

force-build:
	mcconfig -m -p x-cli-lin ag-solo-xs-manifest.json


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

debug-build: vat-device-bundles $(BASEDIR)/vats/bootstrap-src.js
	mcconfig -d -p lin -m ag-solo-xs-manifest.json

./lib/xs-compartments.json: ./lib/*.js ./lib/*/*.js
	cd lib; XS_NPM=xs-npm XS_NODE_API=xs-node-api node -r esm $(TAPE_XS)/bin/modlinks.js $(WORKSPACE) ag-solo/main.js

clean:
	-rm -f ./lib/xs-compartments.json
	-rm -f ./test/xs-compartments.json
	-rm -rf ./bin/ag-solo-xs
	-rm -rf $(BASEDIR)
	-rm -f $(MODDABLE)/build/bin/lin/release/$(PKG)
	-rm -f $(MODDABLE)/build/bin/lin/debug/$(PKG)
	-rm -rf $(MODDABLE)/build/tmp/lin/release/$(PKG)
	-rm -rf $(MODDABLE)/build/tmp/lin/debug/mc/$(PKG)
