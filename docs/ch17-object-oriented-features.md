# 17 - Object Oriented Features of Rust

## 17.1 - Characteristics of Object Oriented Languages

What makes an Object Oriented language? There are many different definitions, but generally an OO language has the following concepts:

- _objects_ package code (methods) together with data.
- _encapsulation_ means that some of the methods and data on an object are private, and some are public. The internal implementation of an object can change without the public API or any users of that object changing.
- _inheritance_ allows one object to inherit data and methods from a parent object or class.
- _polymorphism_ allows two objects with the same public API to be used in place of each other.

It's easy to see how Rust borrows from these concepts and can be used as an OO language. `struct`s in Rust have data and can have methods defined on them and so are similar to objects. Members and methods of a `struct` can be `pub` or private (privacy in Rust is a little different than in other OO languages, but that's something that can be said of many OO languages).

Rust doesn't really have inheritance. But inheritance has fallen out of style in modern program design, often being replaced with composition instead, and traits allow us to provide default implementations for methods which allows a lot of the same sort of code reuse that inheritance traditionally gives us.

Using traits we can easily implement polymorphism in Rust, and we've already seen some examples of this; the `Iterator` trait allows us to pass any number of different types of objects to a `for` loop, for example. _Trait objects_ let us take this a step further.

## 17.2 - Using Trait Objects That Allow for Values of Different Types

In [chapter 8][chap8] we mentioned that a vector can only hold one type. We showed a workaround where we stored a `SpreadsheetCell` enum in a vector, and then used different variants of the enum to store different types. But let's suppose we were implementing a GUI library. We might want a vector of "components" we need to draw on the screen - buttons, select boxes, links, etc... We could use the `enum` trick here to represent all these different component types, but a common feature of GUI libraries is letting users define their own custom components. We can't possibly know all the custom component types ahead of time, so an enum here is going to let us down.

To do this in a class based language we might define a `Component` abstract class with a `draw` method, and then various subclasses of `Component` could implement `draw` differently. In Rust we don't have inheritance, so to do this we'll have to use traits.

### Defining a Trait for Common Behavior

What we'll do is create a `Draw` trait, with a single method called `draw`. Component implementations can implement the `Draw` trait, and we can have a vector which is a collection of _trait objects_.

At runtime, a trait object will be a pair of pointers in memory - one to the instance of a specific type that implements our trait, and another to a table of methods defined on the trait to call at runtime (similar to a v-table in C++). We create a trait object by specifying a pointer (this could be a simple reference or a smart pointer like a `Box<T>`) and the `dyn` keyword (for "dynamic"). In [chapter 19][chap19] we'll talk about the `Sized` trait, and why a pointer is required here.

Let's see some code. Here's our library in _src/lib.rs_:

```rust title="src/lib.rs"
pub trait Draw {
    fn draw(&self);
}

pub struct Screen {
    pub components: Vec<Box<dyn Draw>>,
}

impl Screen {
    pub fn run(&self) {
        for component in self.components.iter() {
            component.draw();
        }
    }
}

pub struct Button {
    pub width: u32,
    pub height: u32,
    pub label: String,
}

impl Draw for Button {
    fn draw(&self) {
        // code to actually draw a button
    }
}
```

The `Draw` trait here should look familiar - if you skipped ahead in this book and this syntax looks unfamiliar, then see [chapter 10][chap10].

The `Screen` struct here has a `components` which has some new syntax: it is a vector of `Box<dyn Draw>`, or in other words a vector of trait objects that implement the `Draw` trait. `Box<dyn Draw>` is a stand-in for any type inside a `Box` that implements `Draw`. `Screen` also has a `run` method which calls the draw method on each member of `components`.

It's important to note that a trait object is very different from a trait bound. If we'd implemented Screen as a generic type with a trait bound:

```rust
// Generic version with trait bounds won't work.
pub struct Screen<T: Draw> {
    pub components: Vec<T>,
}

impl<T> Screen<T>
where
    T: Draw,
{
    pub fn run(&self) {
        for component in self.components.iter() {
            component.draw();
        }
    }
}
```

then we could create a `Screen<Button>` or a `Screen<SelectBox>`, but any such screen would only be allowed to draw a single type. A screen that is only allowed to show buttons is not a very useful screen! By using a trait object here, we can have a collection of different types, and we don't have to know all the possible implementations at compile time. (Although, note that if you need a collection all of the same type, then this solution would be preferable as we can work out how to call `draw` on a concrete type at compile time instead of having to do this at runtime.)

We also added a `Button` type to our library that implements the `Draw` trait. If this were a real library it would probably implement more than just a Button, but that's enough for this example.

Let's look at a crate that uses this library in _src/main.rs_:

```rust title="src/main.rs"
use gui::{Button, Screen};

struct SelectBox {
    width: u32,
    height: u32,
    options: Vec<String>,
}

impl Draw for SelectBox {
    fn draw(&self) {
        // code to actually draw a select box
    }
}

fn main() {
    let screen = Screen {
        components: vec![
            Box::new(SelectBox {
                width: 75,
                height: 10,
                options: vec![
                    String::from("Yes"),
                    String::from("Maybe"),
                    String::from("No"),
                ],
            }),
            Box::new(Button {
                width: 50,
                height: 10,
                label: String::from("OK"),
            }),
        ],
    };

    screen.run();
}
```

The user of our library has defined their own custom `SelectBox` component, and created a `Screen` with a `SelectBox` and a `Button`.

### Trait Objects Perform Dynamic Dispatch

When we call into `component.draw()` in `Screen`, what actually happens at runtime is called _dynamic dispatch_. We have a pointer to the memory for the struct, and a pointer to a table of methods (in this case, just `draw`). For each trait object in the `components` list, we're going to use that table to figure out the correct `draw` function to call at runtime, which will depend on the underlying concrete type.

It's important to realize that this is very different from this example:

```rust
let button = Button {
    width: 50,
    height: 10,
    label: String::from("OK"),
};

button.draw();
```

Here, at compile time we know that `button` is of type `Button`, and we can work out which `draw` function to call at compile time. This is called _static dispatch_.

There's a small performance impact to dynamic dispatch, since we have this extra pointer to follow at runtime. Also, in the static dispatch case we can do performance optimizations like inlining which are not available in the dynamic dispatch case.

## 17.3 - Implementing an Object-Oriented Design Pattern

In this chapter we're going to implement a simple blogging server. A post on the server can be in one of three states: when first created a post will be a "draft". Once the user is done creating the draft, they can ask for a review which will move the post to the "review" state. Finally once reviewer, the post will move to the "published" state. We want to make sure the text for a post isn't published to our blog site until the post is in the published state.

This is a pretty simple example, and I'm sure you could easily imagine implementing this with a state enum and some methods on the Post, but since this is a chapter about OO design, we'll represent the state of the post using the [state pattern](https://en.wikipedia.org/wiki/State_pattern), one of the original twenty-three design patterns documented by the Gang of Four. (We're going to actually implement this twice - once using the OO pattern, and once in a way that's a bit more natural for Rust.) You can find the finished code for this example on [this book's github page](https://github.com/jwalton/rust-book-abridged/tree/master/examples/ch17-post-state-pattern].

As [Wikipedia](https://en.wikipedia.org/wiki/State_pattern) puts it:

> The state pattern is set to solve two main problems:
>
> - An object should change its behavior when its internal state changes.
> - State-specific behavior should be defined independently. That is, adding new states should not affect the behavior of existing states.

The advantage to using the state pattern here is that we can add new states without affecting the existing states.

In _src/lib.rs_, let's write a quick unit test to walk through what our API and workflow will look like:

```rust title="src/lib.rs"
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn post_workflow() {
        let mut post = Post::new();

        post.add_text("I ate a salad for lunch today");
        assert_eq!("", post.content());

        post.request_review();
        assert_eq!("", post.content());

        post.approve();
        assert_eq!("I ate a salad for lunch today", post.content());
    }
}
```

Notice that our public API doesn't event know anything about our state pattern. The idea here will be that `Post` has a `state` which will be a State object. There will be a `Draft` struct, a `PendingReview` struct, and a `Published` struct that represent our different states and all are going to implement the `State` trait. When you call into a method on `Post` like `post.request_review()`, this method will delegate to the current state by doing roughly the equivalent of `this.state = this.state.request_review()`, so the state can control what the next state will be.

Here's the implementation of `Post`, also in _src/lib.rs_:

```rust title="src/lib.rs"
pub struct Post {
    state: Option<Box<dyn State>>,
    content: String,
}

trait State {
    fn request_review(self: Box<Self>) -> Box<dyn State>;
    fn approve(self: Box<Self>) -> Box<dyn State>;
    fn content<'a>(&self, _post: &'a Post) -> &'a str {
        ""
    }
}

impl Post {
    pub fn new() -> Post {
        Post {
            state: Some(Box::new(Draft {})),
            content: String::new(),
        }
    }

    pub fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }

    pub fn request_review(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.request_review())
        }
    }

    pub fn approve(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.approve())
        }
    }

    pub fn content(&self) -> &str {
        self.state.as_ref().unwrap().content(self)
    }
}
```

The `State` trait has `request_review`, `approve`, and `content` methods. State has a default implementation of `content`, so not all the implementors have to reimplement it, but the others will need to be implemented by each `State` individually. The `request_review` and `approve` methods on `State` take a `self: Box<Self>` as their first parameter. This means this method will only be available on a `Box<T>` holding the type. This also takes ownership of the `Box`, effectively invalidating the previous state.

`Post` has some state and some content, both of which are private. We could have made `content` public, but we want to make the content of a `Post` hidden until the post is in the published state, so we created a `content` getter method which delegates to the current state.

Post's constructor creates a new `Draft` state, since this is the state we want to start out in. Since the `state` field is private, can't create a Post in any other state. Post's state is an optional trait object of type `Option<Box<dyn State>>`. We'll talk about why it's an `Option` in just a second.

The `add_text` method takes a mutable reference to self, since it modifies the content of the post. Notice it doesn't interact with the state at all, because no matter what state a post is in, we want to be able to add text. All the other methods on `Post` delegate to the current state. The `request_review` and `approve` methods look very similar - they call into the current state to get the new state, and set self.state. But... they're also a little wordy:

```rust
    pub fn request_review(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.request_review())
        }
    }
```

Why not just `self.state = self.state.request_review()` here? The problem here is that `self.state.request_review()` would try to take ownership of `self.state`, but you can't take ownership of a _part_ of a struct. Remember that ownership is about controlling some allocated memory, and a struct is allocated as a single block of memory. If we took ownership of `self.state` and didn't fill it back in, what would be there in memory? To get around this we make `self.state` an `Option`, and then `self.state.take()` will take ownership of the value in the `Option` and replace it with `None` temporarily. It's never `None` for more than a moment.

The `content` method also needs to deal with the fact that `self.state` is an `Option`:

```rust
    pub fn content(&self) -> &str {
        self.state.as_ref().unwrap().content(self)
    }
```

`as_ref` gives us back a reference to the contents of the `Option`. We call `as_ref` on the Option because we don't want to take ownership of the `Box<dyn state>` in the `Option`. Again, we can't here - `self.state` is an immutable reference, so we can't take ownership of the value inside the `Option` even if we wanted to, since `self`, and by extension `self.option` are both immutable in this context. We call `unwrap()` because we know that `self.state` will always contain a value. This is one of those examples of us knowing more than the compiler - we know `self.state` wil never be `None` here, so we can just panic instead of trying to deal with the case where it's `None`. After the `unwrap` we have a `&Box<dyn State>`, so deref coercion will take place until we ultimately call `content` on the current State's implementation.

Let's have a look at the `Draft` state:

```rust title="src/lib.rs"
struct Draft {}

impl State for Draft {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        Box::new(PendingReview {})
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        self
    }
}
```

Calling `request_review` returns a new `PendingReview` state, effectively advancing us to some new state. Calling `approve` just returns `self`. No one should be trying to approve a `Post` in the `Draft` state, but if they do we want to just leave ourselves in the `Draft` state.

Here are our final two states:

```rust title="src/lib.rs"
struct PendingReview {}

impl State for PendingReview {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        Box::new(Published {})
    }
}

struct Published {}

impl State for Published {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        self
    }

    fn content<'a>(&self, post: &'a Post) -> &'a str {
        &post.content
    }
}
```

The only thing interesting there is that `Published` overrides the default implementation of the `content` method. We need lifetime annotations on this method, since the returned reference will only be valid as long as the passed in `Post`.

### Trade-offs of the State Pattern

This program certainly met the conditions we set out when attempting to use the state pattern. Behavior is controlled by each state, and we could add a new state without modifying the `Post` object at all. States are dependant on each other - the `PendingReview` state creates a `Published` state, for example - but this isn't terrible.

If we were to implement this instead with an `enum` for state and match statements in each of the methods on `Post`, it would be quite manageable for this small example with only three states, but it does mean we'd have to look in many different places to understand what being in the "published" state actually means, and adding a new state would involve updating potentially many different match expressions.

Here are a few exercises that were suggested from the original "The Rust Programming Language":

> - Add a reject method that changes the post's state from PendingReview back to Draft.
> - Require two calls to approve before the state can be changed to Published.
> - Allow users to add text content only when a post is in the Draft state. Hint: have the state object responsible for what might change about the content but not responsible for modifying the Post.

One downside here is that we have a lot of duplicated logic. The `request_review` and `approve` methods on `post` look almost identical to each other. These methods on the `State` implementors often just return `self`, and it would be nice to add default methods for these to the trait, but unfortunately we can't because the return value of a method needs to know the size of what it is returning, and in the trait we don't know what size the concrete implementation of `State` will be. Once solution here might be to define a macro (see [chapter 19][chap19]) to reduce the code repetition here.

The fact that `Post.state` needs to be wrapped in an `Option` makes parts of this implementation feel clumsy and unergonomic.

:::info

One way you might think to try to improve this code is to change the signature of the `request_review` method in the State trait to accept a mutable reference to `Post`:

```rust
trait State {
    fn request_review(&self, _post: &mut Post) {}
    fn approve(&self, _post: &mut Post) {}
    fn content<'a>(&self, _post: &'a Post) -> &'a str {
        ""
    }
}
```

We can just assign `post.self` inside `approve` and `request_review` on the `State` objects. Then we could convert `Post.state` into a `Box<dyn State>` and get rid of the `Option` which should simplify this a lot.

I encourage you to give this a try, but you may find ownership rules will make this more complicated than you think it will be.

:::

### Encoding States and Behavior as Types

Let's take a look at another way of implementing the same behavior, but we're not going to implement it in exactly the same way we would in a traditional OO language. We're going to instead try to encode our state and associated behavior as explicit types. You can find the finished code for this example on [this book's github page](https://github.com/jwalton/rust-book-abridged/tree/master/examples/ch17-post-state-types]. First let's create a `Post` and a `DraftPost`:

```rust title="src/lib.rs"
pub struct Post {
    content: String,
}

pub struct DraftPost {
    content: String,
}

impl Post {
    pub fn new() -> DraftPost {
        DraftPost {
            content: String::new(),
        }
    }

    pub fn content(&self) -> &str {
        &self.content
    }
}

impl DraftPost {
    pub fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }
}
```

We can still call `Post::new`, but this now returns a new `DraftPost` type. `DraftPost` doesn't even implement `content`, so we can't even ask for the content of a `DraftPost` without creating a compile time error. This is an example of "making invalid state unrepresentable" - we don't want to let you get the content of a draft post, and now it's impossible to even write the code that would do such a thing. We want to be able to request a review on our `DraftPost`, so let's add a method for that:

```rust title="src/lib.rs"
// --snip--

impl DraftPost {
    // --snip--

    pub fn request_review(self) -> PendingReviewPost {
        PendingReviewPost {
            content: self.content,
        }
    }
}

pub struct PendingReviewPost {
    content: String,
}

impl PendingReviewPost {
    pub fn approve(self) -> Post {
        Post {
            content: self.content,
        }
    }
}
```

Now we have our three states - `DraftPost`, `PendingReviewPost`, and `Post` - encoded as types. The `request_review` method on `DraftPost` takes ownership of `self`. After calling it, the `DraftPost` will be dropped. This means this method converts a `DraftPost` into a `PendingReviewPost`, and there's no way for us to have any lingering `DraftPost` left over. Importantly this means there's no way to accidentally request two reviews for the same draft post without getting a compiler error. Also, the only way to get the content of a post is to have the full `Post` object, and the only way to get such an object is to call `approve` on a `PendingReviewPost`, so we know we can never get access to the content of a post if it hasn't been approved. All of our behavior is encoded into these types.

We can write a test case to see this in action:

```rust title="src/lib.rs"
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn post_workflow() {
        let mut post = Post::new();

        post.add_text("I ate a salad for lunch today");

        let post = post.request_review();

        let post = post.approve();
        assert_eq!("I ate a salad for lunch today", post.content());
    }
}
```

This isn't completely better than the previous example, rather there are trade offs here that are different. In this test case, you can see that whenever a post changes state, we have used variable shadowing to create a new variable with a new type. If we change our internal implementation so that `add_text` transitioned to a new state, then this called would break, so our implementation is not nearly as encapsulated as it was before.  It's also a little more challenging in this model to create a vector of "posts" - we'd have to wrap these different post states in an enum or in some common trait and use a trait object to stuff them into a vector together, and both of those would "undo" some of the benefits we've just outlined in different ways.

Which of these tradeoffs you make are going to depend heavily on what you're trying to implement, but hopefully this chapter has given you some new tools to use to approach different problems.

Continue to [chapter 18][chap18].

[chap8]: ./ch08-common-collections.md "Chapter 8: Common Collections"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap18]: ./ch18-patterns-and-matching.md "Chapter 18: Patterns and Matching"
[chap19]: ./ch19/ch19-01-unsafe.md "Chapter 19: Advanced Features"
