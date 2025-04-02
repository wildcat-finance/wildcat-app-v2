#!/bin/sh

# Install the latest local build of the wildcat-ts package

# Load environment variables in order of priority
for env_file in .env
do
  if [ -f "$env_file" ]; then
    export $(cat "$env_file" | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
  fi
done

PACKAGE_NAME="@wildcatfi/wildcat-sdk"

if [ -z "$WILDCAT_SDK_PATH" ]; then
  echo "Error: WILDCAT_SDK_PATHis not set in any .env file"
  echo "Please set WILDCAT_SDK_PATH to the absolute path of your local UI package"
  echo "Example: WILDCAT_SDK_PATH=\"/Users/username/wildcat/wildcat.ts/wildcatfi-wildcat-sdk-3.0.39.tgz\""
  exit 1
fi

if ! ls $WILDCAT_SDK_PATH >/dev/null 2>&1; then
  echo "Error: No package found at $WILDCAT_SDK_PATH"
  echo "Please check if the path is correct and the package has been built"
  exit 1
fi

echo "Checking if $PACKAGE_NAME is installed..."
yarn list $PACKAGE_NAME

echo "Removing $PACKAGE_NAME..."
yarn remove $PACKAGE_NAME

echo "Installing latest local build of $PACKAGE_NAME..."
yarn add file:$(ls -t $WILDCAT_SDK_PATH | head -1) --no-cache

echo "Installation complete!"