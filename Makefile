.PHONY: all check-bun bundle compile clean

# Default target: verify bun, build the node bundle, then compile native binaries.
all: check-bun bundle compile

# Fail fast with a helpful message if bun is not installed.
check-bun:
	@command -v bun >/dev/null 2>&1 || { \
		echo "Error: bun is not installed. Install it from https://bun.com/docs/installation"; \
		exit 1; \
	}

# Node-targeted bundle (dist/index.js) used by the npm bin.
bundle: check-bun
	bun run build

# Standalone native binaries for all platforms (dist/bin/).
compile: check-bun
	bun run compile

# Remove all build artifacts.
clean:
	rm -rf dist
