# 8 - Common Collections

Rust's standard library includes a number of _collections_ which store data on the heap:

- _`Vec<T>`_ (short for Vector) is essentially a variable length array.
- _String_ is a variable length collection of characters - like a special vector just for characters.
- _HashMap_ allows you to associate values with keys, and implements the [`Map` trait](https://doc.rust-lang.org/std/iter/struct.Map.html).

These are the most common collections, but if you check [the collections documentation](https://doc.rust-lang.org/stable/std/collections/index.html) you'll see there are many others.

## 8.1 - Storing Lists of Values with Vectors

A `Vec<T>`, also known as a _vector_ is a bit like a "variable-length array". It's a generic type (see [chapter 10](./ch10/ch10-01-generic-data-types.md)), so it can hold any type. Internally, vector stores it's data in a contiguous block of memory which it resizes as required. Since the size of a vector isn't know at compile time, it stores values on the heap. Vectors are used often in Rust programs, so `Vec` is part of the prelude.

If you want to know the details about how a vector is implemented, check out [The Rustonomicon](https://doc.rust-lang.org/stable/nomicon/vec/vec.html). Also be sure to check out [the API documentation](https://doc.rust-lang.org/stable/std/vec/struct.Vec.html) for methods defined on vector that we don't discuss here.

### Creating a New Vector

Like many structs in Rust, we can create a vector with the associated `new` function:

```rust
let v: Vec<i32> = Vec::new();
```

Since we didn't create this vector with any initial values, and we're not calling any functions on it, it's impossible for rustc to infer the generic type of this vector, so we need the `Vec<i32>` type annotation.

If you want to create a vector from an array of initial values, Rust provides the `vec!` macro for this:

```rust
let v = vec![1, 2, 3];
```

### Updating a Vector

```rust
let mut v = Vec::new();

// Add some members to the vector.
v.push(5);
v.push(6);
v.push(7);
```

We don't need to annotate the type of `v` here. Since we're passing `i32`s to `push`, Rust can infer the type of the vector. We do need to mark `v` as mutable though, otherwise we wouldn't be allowed to call `push`. In addition to `push`, there's a `pop` method that removes and returns the last element.

### Reading Elements of Vectors

You can read elements from a vector using the same syntax you'd use to index elements of an array, or you can use the `get` method:

```rust
let v = vec![1, 2, 3, 4, 5];

let third = &v[2]; // This is an &i32.

let fourth = v.get(3); // This is an Option<&i32>
```

`get` returns an `Option`; if we try to `get` an index outside the bounds of the vector, then `get` will return `None`. Since the `[]` syntax doesn't return an `Option` then, as you might expect, it will cause a panic if you try to retrieve an index which is out-of-bounds.

Here's a quick example that looks at first glance like it ought to work, but will fail to compile:

```rust
let mut v = vec![1, 2, 3, 4, 5];

let first = &v[0];

v.push(6); // This will fail to compile!

println!("The first element is: {first}");
```

The simple explanation of why this doesn't work is that, as you may recall from [chapter 4](./ch04-ownership.md#mutable-references), if you have a mutable reference to a value, you can have no other references to that value. Here `v.push(6)` needs a mutable reference to the vector, which it can't get because of the ref stored in `first`. But `first` is just a ref to the first item in the vector? Why does that prevent us from modifying some other part of the vector?

The problem here has to do with the way that vector is implemented. Vector is, at heart, an array. When we `push` an element onto the vector, if there isn't enough room in the underlying array, vector will allocate a new chunk of memory to hold a larger array and copy elements from the old array to the new one. This means that the reference to `first` is really a pointer to a part of that buffer. If `push` were to free this memory, then `first` would point to unallocated memory.

### Iterating over the Values in a Vector

We can use a `for in` loop to iterate over elements in a vector:

```rust
let v = vec![100, 32, 57];
for i in &v {
    println!("{i}");
}
```

If our vector is mutable, we can mutate it as we iterate:

```rust
let mut v = vec![100, 32, 57];
for mut i in &mut v {
    *i += 50;
}
```

Note the explicit '\*` dereference operator here. We'll talk more about the dereference operator in [chapter 15](./ch15-smart-pointers.md#following-the-pointer-to-the-value).

### Using an Enum to Store Multiple Types

A vector can only store elements that are all the same type. Recall though that the different variants of an enum are all the same underlying type, so we can use this to our advantage. Here's an example of a vector of spreadsheet cells where each cell holds different data:

```rust
enum SpreadsheetCell {
    Int(i32),
    Float(f64),
    Text(String),
}

let row = vec![
    SpreadsheetCell::Int(3),
    SpreadsheetCell::Text(String::from("blue")),
    SpreadsheetCell::Float(10.12),
];
```

This trick only works if you know all the types you want to store in a vector ahead of time. If you don't, you can use a trait object, which we'll discuss in [chapter 17][chap17].

### Dropping a Vector Drops Its Elements

Once a vector goes out-of-scope, like any other struct it gets dropped and the memory associated with it is freed.

## 8.2 - Storing UTF-8 Encoded Text with Strings

We're going to talk about strings here in the chapter on collections, because a string is basically a vector of characters. In fact, the underlying implementation of `String` is a `Vec<u8>`. Strings can seem a bit more finicky in Rust than in other languages, but in actual fact most other languages let you do very unsafe things with Strings and the real difference is that Rust tries to protect you from this.

### What Is a String?

In the core language, Rust only defines the string slice `&str`. This represents a string of characters that is stored "somewhere else", like in the program binary. The `String` type in Rust isn't actually part of the core language, but part of the standard library.

A `String` represents a growable, mutable UTF-8 encoded string stored on the heap.

### Creating a New String

We can create a String with `new`, just like a vector:

```rust
let mut s = String::new();
```

Any type that implements the `Display` trait has a `to_string` method which can be used to create a string:

```rust
let s = "Hello, world!".to_string();
```

And as we've seen we can also use `String::from` to copy a string literal into a String:

```rust
let s = String::from("Hello, World!");
```

`to_string` and `String::from` do exactly the same thing here. Which you choose is a matter of style and readability.

### Updating a String

Strings, like vectors, can grow in size and be modified. You can concatenate Strings with the `+` operator or the `format!` macro.

Some examples:

```rust
let mut foobar = String::from("foo");

// push_str() appends a string slice.
foobar.push_str("bar");

// push() appends a single character.
foobar.push('!');
```

We can concatenate with the `+` operator, similar to JavaScript, Java, and Go:

```rust
// + can be used to concatenate strings:
let s1 = String::from("Hello, ");
let s2 = String::from("World!");
let s3 = s1 + &s2;
```

The `+` operator here will take ownership of `s1`, so `s1` won't be valid after the `+` expression. The eagle eyed among you will notice we didn't write `s1 + s2`, but `s1 + &s2`. The `+` operator is actually implemented using the `add` method on String. If you look up `add`, you'll it is implemented using generics, but basically in this particular case the function signature boils down to:

```rust
fn add(self, s: &str) -> String
```

And so the second parameter needs to be a reference. Those readers who are especially alert might also notice that we're passing an `&String` to the add operator here and not an `&str` for that second parameter, but this is okay because Rust can _coerce_ the type of `&s2` to `&str`. We'll talk more about this in [chapter 15][chap15].

If we want to concatenate multiple strings, we can use the `format!` macro, which is a bit like `println!` except it evaluates to a `String` instead of printing the result to the screen:

```rust
let s1 = String::from("tic");
let s2 = String::from("tac");
let s3 = String::from("toe");

let s = format!("{s1}-{s2}-{s3}");
```

`format!` doesn't take ownership of any of these values.

### Indexing into Strings

Unlike with a vector, you can't index into a string with `[]`.

Many languages treat indexing into a string as getting the nth byte from a string, but mainly this is a throwback to the days when we used encodings like 8-bit ASCII, where a single byte was a single character on the screen. In Rust, Strings are stored using UTF-8 encoding, and it's not entirely clear what the index operator should do here. Should `s[0]` return the first byte? The first char? Since this answer isn't clear, Rust errs on the side of safety and just doesn't let you do this. You can however convert a String into the underlying bytes with the `s.bytes()` method or to an array of chars with `s.chars()`.

### Bytes and Scalar Values and Grapheme Clusters! Oh My!

We can look at any UTF-8 string as a series of bytes, but we can also look at it as a series of `char`s (which represent [unicode scalar values](https://www.unicode.org/glossary/#unicode_scalar_value)), or as a series of grapheme clusters (i.e. how many "letters" it takes up on the screen).

The word "Hello" contains five bytes, five letters, and five grapheme clusters. If you replaced the first byte with a 74, you'd change it to "Jello".

The Ukrainian word for "rust" is "іржа", which contains 8 bytes: `[209, 150, 209, 128, 208, 182, 208, 176]`. Each of pair of bytes encodes a single unicode scalar value, so there are four `char`s in this, and there are also four grapheme clusters. If you replaced the first byte with a 74 you'd transform it into an invalid unicode string.

This is a female astronaut emoji: "🧑‍🚀". She's actually two other emoji joined together with a [zero-width-joiner](https://www.unicode.org/emoji/charts/emoji-zwj-sequences.html). Our astronaut emoji contains a total of eleven bytes: `[240, 159, 167, 145, 226, 128, 141, 240, 159, 154, 128]`. These bytes are the encoding of only three `char`s : `['🧑', '\u{200D}', '🚀']`. And, this string contains only a single grapheme cluster - it displays as a single "letter" in the text of this book.

### Slicing Strings

While you can't index a single byte or char out of a string, you can get a slice of bytes out of a string:

```rust
let hello = "Здравствуйте";

let s = &hello[0..4];
```

Here `s` ends up being a `&str` that contains the first four bytes of the string, which will be the string "Зд". If you tried to get `&hello[0..1]`, this would return the first byte, but since this would result in an invalid UTF-8 string, this will cause a panic. You need to be extremely careful when slicing strings that you are slicing at valid char boundaries.

### Methods for Iterating Over Strings

If you want to get at the underlying collection of characters or the collection of bytes, the best way is to use methods defined on String to get these explicitly:

```rust
// Get at the underlying chars in a string
for c in "Зд".chars() {
    println!("{c}");
}

// Get at the underlying bytes
for b in "Зд".bytes() {
    println!("{b}");
}
```

Getting Grapheme clusters from a String is a surprisingly non-trivial problem (it's called ["Unicode text segmentation"](https://unicode.org/reports/tr29/) if you're interested), so Rust doesn't provide a function to do it in the standard library. If you need this functionality, you'll have to look to [a third party crate](https://crates.io). If you're not careful about this, though, it's easy to insert a "-" into the middle of "🧑‍🚀" and accidentally turn it into "🧑-🚀" on-screen.

## 8.3 - Storing Keys with Associated Values in Hash Maps

`HashMap<K, V>` stores a mapping of keys of type `K` to values of type `V`. This is just like a `Map` in Go or JavaScript, or a HashMap in Java. The underlying implementation is a hash table with a _hashing function_ that converts each key into a number.

### Basic Hash Map Operations

Since `HashMap` isn't in the prelude, we have to `use` it:

```rust title="src/main.rs"
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    // Insert some values into the map
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);

    // Access values with `get`
    let team_name = String::from("Blue");
    let score = scores.get(&team_name).copied().unwrap_or(0);

    // Iterate over the keys with a for loop:
    for (key, value) in &scores {
        println!("{key}: {value}");
    }
}
```

Note that `.get()` here will return an `Option<&v>`. If there's no value in the map we'll get back a `None`. We call `copied` to convert the `Option<&i32>` into an `Option<i32>`, and then call `unwrap_or` to provide a default for the `None` case. One important thing to note here especially if you're coming from JavaScript is that, when iterating over members of a Hash Map, you are not guaranteed to get them back in the same order you inserted them in. The ordering is arbitrary.

### Hash Maps and Ownership

HashMaps take ownership of both keys and values passed to them:

```rust
use std::collections::HashMap;

let field_name = String::from("Favorite color");
let field_value = String::from("Blue");

let mut map = HashMap::new();
map.insert(field_name, field_value);
// field_name and field_value are invalid at this point
// as they have been moved.
```

For types that implement the `Copy` trait, the values will be copied into the hash map, so we won't have to worry about ownership. If we don't want the hash map to take ownership, we can store keys or values as references, but in this case the values the references point to must be valid for as long as the hash map exists. For this we need to talk about lifetimes, which we'll do in [chapter 10](./ch10/ch10-03-lifetimes.md).

### Updating a Hash Map

When inserting into a Hash Map, the value we want to insert might already exist. If we just do a straight `insert`, this will overwrite the value that's already there:

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();

scores.insert(String::from("Blue"), 10);

// Overwrite an existing value in the HashMap
scores.insert(String::from("Blue"), 25);
```

We can use the `entry` method on a hash map to get information about an existing entry in the map. The `entry` method returns an [`Entry` enum](https://doc.rust-lang.org/std/collections/hash_map/enum.Entry.html), which has methods defined on it that allow us to manipulate the map. For example, `Entry` has an `or_insert` method which will return the existing entry or insert a new entry if there is nothing stored at that key:

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);

    // Set a value only if it doesn't exist
    let new_score = scores.entry(String::from("Blue")).or_insert(50);
}
```

One interesting thing about `or_insert` is that it returns a mutable reference to the existing or inserted value, which means we can use the return value from `or_insert` to update the value in the hash map. This example counts how many times each word appears in a string. It works by dereferencing the `count` in the map with the `*` operator to let us increment the value for each word:

```rust
use std::collections::HashMap;

fn main() {
    let text = "hello world wonderful world";

    let mut map = HashMap::new();

    for word in text.split_whitespace() {
        let count = map.entry(word).or_insert(0);
        *count += 1;
    }

    println!("{:?}", map);
}
```

If you're a JavaScript programmer this is maybe going to look like magic. What's going on here is that `count` is a reference - essentially a pointer - to memory inside the hash map. We can use that pointer to modify the data in the hash map.

### Hashing Functions

An exploration of the inner workings of the Hash Map and the hash table data structure that underlies it are beyond the scope of this chapter, but one important fact about a hash map is that each key must be reduced to a single number by means of something called a _hash function_. In Rust the default hash function is [SipHash](https://en.wikipedia.org/wiki/SipHash) which was chosen because, even though it isn't the fastest hash function, it does protect against certain denial-of-service attacks you can perform against a hash table.

You can replace the default hash function by creating a custom _hasher_. You need to implements the `BuildHasher` trait, or find a crate on [crates.io](https://crates.io) that implements it.

Continue to [chapter 9][chap9].

[chap9]: ./ch09-error-handling.md "Chapter 9: Error Handling"
[chap15]: ./ch15-smart-pointers.md "Chapter 15: Smart Pointers"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
