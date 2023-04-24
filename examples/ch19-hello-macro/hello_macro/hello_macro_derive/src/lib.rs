use proc_macro::TokenStream;
use quote::quote;
use syn;

// This line tells Rust that this is the macro
// to call when someone does `#[derive(HelloMacro)]`.
#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // Construct a representation of Rust code as a syntax tree
    // that we can manipulate
    let ast = syn::parse(input).unwrap();

    // Build the trait implementation
    impl_hello_macro(&ast)
}

// It's very common to split the derive macro into one function
// that parses the input (`hello_macro_derive`) and one that
// generates the code (`impl_hello_macro`).
fn impl_hello_macro(ast: &syn::DeriveInput) -> TokenStream {
    let name = &ast.ident;
    let gen = quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello, Macro! My name is {}!", stringify!(#name));
            }
        }
    };

    // Convert `gen` into a `TokenStream`.
    gen.into()
}