use hello_macro::HelloMacro;
use hello_macro_derive::HelloMacro;

// This derive attribute will run our derive macro.
#[derive(HelloMacro)]
struct Pancakes;

fn main() {
    // This will print "Hello, Macro! My name is Pancakes!"
    Pancakes::hello_macro();
}