## Source ruby

## Download
mkdir ruby_sources
cd ruby_sources
bundle init
bundle add cddl
bundle install --path ./
sed -i -e "s/order.reverse_each do |name|/i = order.count - 1\r\n      #order.reverse_each do |name|\r\n      while i >= 0 do\r\n        name = order[i]\r\n        i -= 1/g" ./ruby/*/gems/abnc-0.1.1/lib/parse/ast.rb
cd ..

## install emcripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
git pull
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..

## ruby wasm
git clone https://github.com/ruby/ruby.wasm.git
cd ruby.wasm
./bin/setup
bundle exec rake compile
rake --tasks
rake build:head-wasm32-unknown-emscripten-full
cd ..

# build
cp -rv ruby.wasm/rubies/ruby-head-wasm32-unknown-emscripten-full ./
cp -rv ruby_sources/ruby/*/* ruby-head-wasm32-unknown-emscripten-full/usr/local/lib/ruby/gems/*/
make
cp -rv dist vscode-extension/server/pkg/

## test
cd vscode-extension
npm update
cd client && npm update
cd ../server && npm update
cd .. && npm run webpack
cd ..
