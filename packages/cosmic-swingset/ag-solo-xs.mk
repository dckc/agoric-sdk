export MODDABLE := $(HOME)/projects/moddable
export PATH := $(MODDABLE)/build/bin/lin/release:$(PATH)

PKG=cosmic-swingset

BASEDIR=t3

check-imports: $(MODDABLE)/build/bin/lin/release/cosmic-swingset
	$(MODDABLE)/build/bin/lin/release/cosmic-swingset $(BASEDIR)

$(MODDABLE)/build/bin/lin/release/cosmic-swingset: ./bin/ag-solo-xs.js lib/ag-solo/*.js lib/xs-npm/*.js lib/xs-nodejs/*.js lib/ag-solo-todo/*.js
	mcconfig -m -p x-cli-lin ag-solo-xs-manifest.json

# run in simulator and xsbug
debug-lite:
	mcconfig -d -p lin -m ag-solo-xs-manifest.json

force-build:
	mcconfig -m -p x-cli-lin ag-solo-xs-manifest.json


### rest of the makefile is not recently tested

t3:
	make scenario3-setup

# bundle all the vats in t3/vats
t3/vats/bootstrap-src.js: t3/vats/bootstrap.js
	cd t3/vats && node -r esm ../../../SwingSet/scripts/build-bundle.js bootstrap.js bootstrap-src.js
	cd t3/vats && for vat in vat-*.js; do \
		bundle=`echo $$vat | perl -pe 's/vat-([a-z]+).js/vat_$$1-src.js/'`; \
		echo $$vat '->' $$bundle; \
		node -r esm ../../../SwingSet/scripts/build-bundle.js $$vat $$bundle; \
		done

vat-device-bundles: ../SwingSet/src/bundles/mailbox-src.js

 ../SwingSet/src/bundles/mailbox-src.js:
	cd ../SwingSet && node -r esm scripts/build-bundle.js

debug-build: vat-device-bundles t3 t3/vats/bootstrap-src.js
	mcconfig -d -p lin -m ag-solo-xs-manifest.json

clean:
	-rm -rf $(MODDABLE)/build/tmp/lin/release/$(PKG)
	-rm -f $(MODDABLE)/build/bin/lin/release/$(PKG)
	-rm -rf $(MODDABLE)/build/tmp/lin/debug/$(PKG)
	-rm -f $(MODDABLE)/build/bin/lin/debug/$(PKG)
