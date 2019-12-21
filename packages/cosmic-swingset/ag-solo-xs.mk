export MODDABLE := $(HOME)/projects/moddable
export PATH := $(MODDABLE)/build/bin/lin/release:$(PATH)

PKG=cosmic-swingset


# NOTE: yarn link n-readlines@@

BASEDIR=t3
release-build: xs_modules vat-device-bundles t3 t3/vats/bootstrap-src.js
	mcconfig -p x-cli-lin ag-solo-xs-manifest.json
	cd $(MODDABLE)/build/tmp/lin/release/$(PKG) && $(MAKE)
	$(MODDABLE)/build/bin/lin/release/$(PKG) $(BASEDIR)

t3:
	echo check out master and make scenario3-setup
	exit 1

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

debug-build: xs_modules vat-device-bundles t3 t3/vats/bootstrap-src.js
	mcconfig -d -p lin -m ag-solo-xs-manifest.json

xs_modules: ../../node_modules
	ln -s ../../node_modules $@

clean:
	-rm -rf $(MODDABLE)/build/tmp/lin/release/$(PKG)
	-rm -f $(MODDABLE)/build/bin/lin/release/$(PKG)
	-rm -rf $(MODDABLE)/build/tmp/lin/debug/$(PKG)
	-rm -f $(MODDABLE)/build/bin/lin/debug/$(PKG)
