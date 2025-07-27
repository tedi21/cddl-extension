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
mkdir ruby_wasm
cd ruby_wasm
git clone https://github.com/ruby/ruby.wasm.git
cd ruby.wasm
## MODIFY STACK_SIZE AND ASYNCIFY_STACK_SIZE
sed -i -e 's/executor.system ".\/autogen.sh", chdir: src_dir/executor.system "sed", \n                        "-i",\n                        "-e",\n                        "s\/RUBY_APPEND_OPTIONS(LDFLAGS, \\"-sASYNCIFY\\")\/RUBY_APPEND_OPTIONS(LDFLAGS, \\"-sASYNCIFY\\")\\\\n\\\\t\\\\tRUBY_APPEND_OPTIONS(LDFLAGS, \\"-sSTACK_SIZE=10MB\\")\\\\n\\\\t\\\\tRUBY_APPEND_OPTIONS(LDFLAGS, \\"-sASYNCIFY_STACK_SIZE=10MB\\")\/g",\n                        "configure.ac", chdir: src_dir\n        executor.system ".\/autogen.sh", chdir: src_dir/g' ./lib/ruby_wasm/build/product/ruby_source.rb
./bin/setup
bundle exec rake compile
rake --tasks
rake build:head-wasm32-unknown-emscripten-full
cd packages/npm-packages/ruby-wasm-emscripten
sed -i -e 's/format: "umd"/format: "cjs"/g' rollup.config.mjs
npm i rollup
cp -rv ../../../rubies/ruby-head-wasm32-unknown-emscripten-full ./
cp -rv ../../../../../ruby_sources/ruby/*/* ruby-head-wasm32-unknown-emscripten-full/usr/local/lib/ruby/gems/*/
./build-package.sh ./ruby-head-wasm32-unknown-emscripten-full

## test
cp -rv dist ../../../../../vscode-extension/server/pkg/
cd ../../../../../vscode-extension
npm update
cd client && npm update
cd ../server && npm update
cd ..
npm run webpack
code .
