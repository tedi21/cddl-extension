CXX=em++
CXXFLAGS=-O3
CC=emcc
CCFLAGS=-O3
LDFLAGS=-O3 -sEXIT_RUNTIME=0 -sINVOKE_RUN=0 -sMODULARIZE=1 -sALLOW_MEMORY_GROWTH=1 -s'EXPORT_NAME="createModule"' -sFORCE_FILESYSTEM=1 -sASYNCIFY -sSTACK_SIZE=10MB -sASYNCIFY_STACK_SIZE=10MB 
RUBY_ROOT_BUILD=./ruby_wasm/ruby.wasm/build/wasm32-unknown-emscripten
RUBY_BUILD=$(RUBY_ROOT_BUILD)/ruby-head-wasm32-unknown-emscripten-full
RUBY_HEADERS=ruby-head-wasm32-unknown-emscripten-full/usr/local/include/ruby-3.5.0+3
RUBY_INCLUDE=-I$(RUBY_HEADERS)/wasm32-emscripten -I$(RUBY_HEADERS)
RUBY_LIB=-L$(RUBY_ROOT_BUILD)/openssl-3.2.0/opt/usr/local/lib -L$(RUBY_ROOT_BUILD)/yaml-0.2.5/opt/usr/local/lib -L$(RUBY_ROOT_BUILD)/zlib-1.3.1/opt/usr/local/lib -L$(RUBY_BUILD) $(RUBY_BUILD)/ext/cgi/escape/escape.a $(RUBY_BUILD)/ext/continuation/continuation.a $(RUBY_BUILD)/ext/coverage/coverage.a $(RUBY_BUILD)/ext/date/date_core.a $(RUBY_BUILD)/ext/digest/digest.a $(RUBY_BUILD)/ext/digest/bubblebabble/bubblebabble.a $(RUBY_BUILD)/ext/digest/md5/md5.a $(RUBY_BUILD)/ext/digest/rmd160/rmd160.a $(RUBY_BUILD)/ext/digest/sha1/sha1.a $(RUBY_BUILD)/ext/digest/sha2/sha2.a $(RUBY_BUILD)/ext/etc/etc.a $(RUBY_BUILD)/ext/fcntl/fcntl.a $(RUBY_BUILD)/ext/json/generator/generator.a $(RUBY_BUILD)/ext/json/parser/parser.a $(RUBY_BUILD)/ext/monitor/monitor.a $(RUBY_BUILD)/ext/objspace/objspace.a $(RUBY_BUILD)/ext/openssl/openssl.a $(RUBY_BUILD)/ext/psych/psych.a $(RUBY_BUILD)/ext/rbconfig/sizeof/sizeof.a $(RUBY_BUILD)/ext/ripper/ripper.a $(RUBY_BUILD)/ext/stringio/stringio.a $(RUBY_BUILD)/ext/strscan/strscan.a $(RUBY_BUILD)/ext/zlib/zlib.a $(RUBY_BUILD)/enc/libenc.a $(RUBY_BUILD)/enc/libtrans.a $(RUBY_BUILD)/ext/extinit.o $(RUBY_BUILD)/enc/encinit.o -lruby-static -ldl -lm -lc -lpthread  -lssl -lcrypto -lyaml -lz
RUBY_GEM=ruby-head-wasm32-unknown-emscripten-full/usr/local/lib
EXEC=ruby.js
SRC=binding_ruby.cpp
OBJ=$(SRC:.cpp=.o)

all: $(EXEC)

ruby.js: $(OBJ)
	@mkdir -p dist
	$(CXX) $(addprefix obj/,$^) -o dist/$@ --bind $(LDFLAGS) $(RUBY_LIB) --preload-file $(RUBY_GEM)@/usr/local/lib --exclude-file '*.gem' --exclude-file "libruby-static.a" 

%.o: %.cpp
	@mkdir -p obj
	$(CXX) $(CXXFLAGS) $(RUBY_INCLUDE) -c $< -o obj/$@ -sDISABLE_EXCEPTION_CATCHING=0

.PHONY: clean mrproper

clean:
	@rm -rf obj

mrproper: clean
	@rm -rf dist
