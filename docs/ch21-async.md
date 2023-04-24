# 21 - Async Programming

In this section we're going to re-implement our web server from [chapter 20][chap20] using async functions. We're just going to give you enough here to get your feet wet. For further reading, check out [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/), and the [Tokio Tutorial](https://tokio.rs/tokio/tutorial). As usual, if you're looking for the full source for this project, it's [in the GitHub repo](https://github.com/jwalton/rust-book-abridged/tree/master/examples/ch21-async-web-server).

## JavaScript

Wait... Isn't this supposed to be a book about Rust? It is, but we're going to start this chapter off talking about JavaScript. Love it or hate it, JavaScript is the most popular language in the world, and it is probably where most people were first exposed to the idea of async programming.

```js title="user.js"
// JavaScript Code
import * as fs from "fs/promises";

async function getUserName() {
  const username = await fs.readFile("./username.txt", { encoding: "utf-8" });
  console.log(`Hello ${username}`);
}
```

Even if you don't know JavaScript, hopefully this example is simple enough that you can follow along. We're calling `fs.readFile` to read in a file. In JavaScript this is going to return a `Promise<string>`. A `Promise` in JavaScript is the result of some calculation we don't know yet (similar to a `Future` in Java, or as we'll see in a moment a `Future` in Rust). The magic in this function happens at the `await` keyword. When we `await` a promise, the current function stops executing, allowing other functions to run. At some future point in time when the promise resolves, this function will continue from where it left off.

In JavaScript, the above is actually more or less syntactic sugar for:

```js title="user.js"
// JavaScript Code
import * as fs from 'fs/promises';

function getUserName() {
    return fs.readFile("./username.txt", { encoding: 'utf-8' })
        .then(username => console.log(`Hello ${username}`));
```

Here it's a little easier to understand how the execution of the function can be suspended. `getUserName` calls into `readFile` which creates a promise, and then `getUserName` returns. At some future point in time, when the promise resolves, someone will call into the closure we're passing to `then`. Running this closure is how we "continue" this function in JavaScript.

In Rust, we could rewrite the above example as something like:

```rust
use std::{error::Error};
use tokio::fs;

async fn get_user_name() -> Result<(), Box<dyn Error>> {
    let username = fs::read_to_string("./username.txt").await?;
    println!("Hello {username}");

    Ok(())
}

```

This is very similar to the JavaScript example in many ways. Here `fs::read_to_string` returns a type that implements the `Future` trait (specifically `Future<Output = Result<String, Error>>`). When we call `await` on the future, execution of this function is suspended, and at some future point someone will resume execution and the result of the `await` will be a `Result<String, Error>`. The `?` operator turns the `Result` into a `String`.

The important things to know here are that - in JavaScript or in Rust - you can only use `await` inside a function that's declared `async`, and `await` will temporarily suspend execution of this function.

## The Runtime

In our JavaScript example, we glossed over one important detail. Someone calls calls into the closure we're passing to `then`, but who is this mysterious someone? In JavaScript, everything runs in an event loop which is part of the JavaScript runtime. When the promise eventually resolves, it will queue a task and the event loop will pick it up and call into the closure. In our Rust example, we have the same problem; who takes care of restarting `get_user_name` when the `Future` from `fs::read_to_string` completes? Here again, it's the runtime.

Except of course that Rust doesn't have a runtime. In Rust, the only code that runs in your application is code you write or code you bring in from a crate, so you need to either write your own runtime or pull one in from a crate! The most popular at the moment is [Tokio](https://tokio.rs/), but there are other options. Also, unlike in JavaScript where everything is single threaded on the event loop, in Rust our async runtime could be implemented on a single thread or could be multithreaded (Tokio supports both).

Tokio provides us with a lot more than just a runtime. If you look at our Rust example above, you'll notice we're calling `tokio::fs::read_to_string` instead of `std::io::read_to_string`. The standard library version does the same thing, but it doesn't return a `Future`, it blocks until the file is read. If we were to use `std::io::read_to_string` here, it would block this thread for a while, potentially stopping other async code from running. Tokio provides async versions of many standard library functions in this way, and because of this, refactoring non-async code to async is usually not trivial.

## An `async` Web Server

Let's write an async web server:

```sh
$ cargo new hello-async
$ cd hello-async
```

Update our _Cargo.toml_ to include Tokio:

```toml title="Cargo.toml"
[package]
name = "hello-async"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
```

Notice the `features = ["full"]`. Features allow us to conditionally compile only the parts of Tokio we need. Tokio provides duplicates of most of the standard library, and if you don't need parts of it you can remove them here to make your binary smaller. Here's the code:

```rust title="src/main.rs"
use std::{error::Error, time::Duration};
use tokio::{
    fs,
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    net::{TcpListener, TcpStream},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let port = 7878u16;
    let listen_address = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(listen_address).await.unwrap();
    println!("Listening on port {}", port);

    loop {
        let (stream, _) = listener.accept().await.unwrap();
        handle_connection(stream).await;
    }
}

async fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&mut stream);

    let mut lines = buf_reader.lines();
    let request_line = lines.next_line().await.unwrap().unwrap();

    println!("Incoming request for {}", request_line);

    match &request_line[..] {
        "GET / HTTP/1.1" => send_response(stream, 200, "OK", "hello.html").await,
        "GET /sleep HTTP/1.1" => {
            tokio::time::sleep(Duration::from_secs(5)).await;
            send_response(stream, 200, "OK", "hello.html").await;
        }
        _ => send_response(stream, 404, "NOT FOUND", "404.html").await,
    }
}

async fn send_response(mut stream: TcpStream, code: u16, reason: &str, filename: &str) {
    let contents = fs::read_to_string(filename).await.unwrap();
    let length = contents.len();
    let response =
        format!("HTTP/1.1 {code} {reason}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).await.unwrap();
}
```

If you want to run this, you'll need the `hello.html` and `404.html` files from [chapter 20][chap20].

This looks very similar to our previous single and multithreaded web servers. We have to `use tokio::io::AsyncBufReadExt` to be able to call `buf_reader.lines` in `handle_connection`, because in Tokio `lines` is defined on the `AsyncBufReadExt` trait, and similar for `tokio::io::AsyncWriteExt` and `stream.write_all` in `send_response`. We've also replaced some `for` loops as Rust doesn't (yet) support async for loops. (We also simplified the code for parsing the request, since we weren't actually using any of the headers in our previous examples so we don't bother reading them here.)

This is also very similar to our single threaded version because if you try reloading the "/sleep" route a few times, you'll see that this is only handling a single request at once. Isn't async supposed to fix that for us? The problem is that in our main loop, we're `await`ing `handle_connection`:

```rust
    loop {
        let (stream, _) = listener.accept().await.unwrap();
        handle_connection(stream).await;
    }
```

That `await` will cause the main loop to suspend until `handle_connection` completes. If you're an experienced JavaScript programmer, you might think you can just remove the `await`. This would work in JavaScript, but not in Rust. Rust futures are _lazy_, meaning they won't make any progress if no one is `await`ing them.

:::info

If you have a look at the definition of the `Future` trait, you'll see that `Future` has only one method:

```rust
fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
```

When we `await` a future, what's happening under the covers is that the runtime will call into `poll` to get the future to make progress. If the future completes, it will return the `Poll::Ready<Output>` value. If not, it will return a `Poll::Pending`. When the Future is ready to make progress again, it will call into the `Waker` stored in the `Context` to let the runtime know it should be polled again.

If you're interested in the internals of `async` and `Future`s in Rust, this is all covered in much greater detail in [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/).

:::

In order to fix this problem, we have to create this future, then let Tokio know we'd like it to be polled. Tokio's answer to this is something called a `Task`. We can spawn a task with `tokio::spawn`:

```rust
    loop {
        let (stream, _) = listener.accept().await.unwrap();
        tokio::spawn(async move {
            handle_connection(stream).await;
        });
    }
```

You might have expected `spawn` to take a closure, but it actually takes a future! Here we're using an `async` block to create a future, and the `move` keyword to move ownership of the `stream` into that block. We could also have rewritten this as:

```rust
    loop {
        let (stream, _) = listener.accept().await.unwrap();
        let f = handle_connection(stream);
        tokio::spawn(f);
    }
```

But the async block is more idiomatic. `spawn` returns a `tokio::task::JoinHandle<T>` similar to the `JoinHandle` we get when you spawn a thread. You can `await` on this handle to wait for the underlying Future to complete.

Tasks are a form of "green thread". Spawning a task is very lightweight, involving only a single allocation and 64 bytes of memory, so you can easily spawn thousands or millions of tasks (which would be ill-advised if we were talking about OS threads).

If you've read this far, you've made it to the end of the book. If you enjoyed it, please [star the book on GitHub](https://github.com/jwalton/rust-book-abridged), or [buy me a coffee](https://github.com/sponsors/jwalton).  Happy Rusting!

[chap20]: ./ch20/ch20-01-single-threaded-web-server.md "Chapter 20: Multithreaded Web Server"
