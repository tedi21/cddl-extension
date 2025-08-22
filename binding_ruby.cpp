#include <ruby.h>
#include <emscripten/bind.h>

void exec(const std::vector<std::string>& argv)
{
	std::vector<char*> options;
	for (const auto& arg : argv) {
		options.push_back(const_cast<char*>(arg.c_str()));
	}

	RUBY_INIT_STACK;
	ruby_init();

	void* node = ruby_options(options.size(), options.data());

	int state;
	if (ruby_executable_node(node, &state))
	{
		state = ruby_exec_node(node);
	}
	
	if (state != 0)
	{
		/* print exception */
		VALUE exception = rb_errinfo();
		rb_set_errinfo(Qnil);
		if (RB_TEST(exception)) 
		{
			rb_warn("Ruby script error: %" PRIsVALUE "", rb_funcall(exception, rb_intern("full_message"), 0));
		}
	}
}

void eval(const std::string& exp)
{
	int state;
	rb_eval_string_protect(exp.c_str(), &state);
	
	if (state != 0)
	{
		/* print exception */
		VALUE exception = rb_errinfo();
		rb_set_errinfo(Qnil);
		if (RB_TEST(exception)) 
		{
			rb_warn("Ruby script error: %" PRIsVALUE "", rb_funcall(exception, rb_intern("full_message"), 0));
		}
	}
}


EMSCRIPTEN_BINDINGS(module) {
	emscripten::function("exec", &exec);
	emscripten::function("eval", &eval);
	emscripten::register_vector<std::string>("StringVector");
}
