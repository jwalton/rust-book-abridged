# 20.1 - Building a Single-Threaded Web Server

In this chapter we're going to build a simple HTTP server to put together a number of things we've learned so far. As usual, the code for this project is [available on the GitHub repo](https://github.com/jwalton/rust-book-abridged/examples/ch20-single-threaded-web-server).

## HTTP Requests

An HTTP GET request looks something like:

```txt
GET /index.html HTTP/1.1
Host: example.com
Accept-Language: en-us
Accept-Encoding: gzip, deflate
Connection: Keep-Alive

```

Each newline here is actually a CRLF or a `\r\n`. The first line is of the format `Method Request-URI HTTP-Version CRLF`. This is followed by one or more _headers_, followed by a blank line, and then optionally a body. (For our server, we'll assume only a maniac would send a GET with a body.)

The response looks very similar:

```txt
HTTP/1.1 200 OK
Content-Type: text
Content-Length: 26

<html>Hello, World!</html>
```

The first line is `HTTP-Version Status-Code Reason-Phrase CRLF`, and this is followed by headers, a blank line, and then the response body.

## Some HTML to Serve

Let's create a project:

```sh
$ cargo new hello
$ cd hello
```

In order to create a server, first we need something to serve, so we'll create a couple of HTML file:

```html title="hello.html"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hello!</title>
  </head>
  <body>
    <h1>Hello!</h1>
    <p>Hi from Rust</p>
  </body>
</html>
```

and:

```html title="404.html"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hello!</title>
  </head>
  <body>
    <h1>Oops!</h1>
    <p>Sorry, I don't know what you're asking for.</p>
  </body>
</html>
```

And then here is the code for our server:

```rust title="src/main.rs"
use std::{
    fs,
    io::{prelude::*, BufReader},
    net::{TcpListener, TcpStream},
};

fn main() {
    let port = 7878u16;
    let listen_address = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(listen_address).unwrap();

    println!("Listening on port {}", port);

    for stream in listener.incoming() {
        let stream = stream.unwrap();

        handle_connection(stream);
    }
}

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&mut stream);

    // A line could be an error if it contains invalid
    // UTF-8, or if there's a problem reading from the
    // underlying stream.  We ignore these errors here.
    let http_request: Vec<_> = buf_reader
        .lines()
        .map(|result| result.unwrap())
        .take_while(|line| !line.is_empty()) // Blank line is end of request.
        .collect();

    let request_line = &http_request[0];

    println!("Incoming request for {}", request_line);

    if request_line == "GET / HTTP/1.1" {
        send_response(stream, 200, "OK", "hello.html");
    } else {
        send_response(stream, 404, "NOT FOUND", "404.html");
    }
}

fn send_response(mut stream: TcpStream, code: u16, reason: &str, filename: &str) {
    let contents = fs::read_to_string(filename).unwrap();
    let length = contents.len();
    let response =
        format!("HTTP/1.1 {code} {reason}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).unwrap();
}
```

If we `cargo run` this and point a browser at [http://localhost:7878/](http://localhost:7878/), we should see our web page!

:::info

Note that we're using `io::prelude::*`. The `io` library has it's own "prelude" which brings a number of io-related symbols into scope for us.

:::

## Listening to the TCP Connection

Let's start with the `main` function. We call `TcpListener::bind` to start listening on a port. This returns a `TcpListener` instance, so it's basically a constructor for `TcpListener`. Note that we're binding to "127.0.0.1", so you'll only be able to access this web server from the same machine you're running it on. `bind` can fail for a variety of reasons. For example, if we tried to bind to port 80 and we weren't root, this would fail because we don't have sufficient permissions. We're glossing over all the error handling with a call to `unwrap`.

Once we have out `TcpListener` we call `incoming` on it, which returns an iterator of `Result<TcpStream, Error>`. We'll get an item from this iterator every time a client tries to connect. Note this iterator will never return `None`! This loop is going to go on forever (or at least until we hit CTRL-C to terminate this program). A connection attempt can fail for a variety of reasons. In a production web server we'd want to handle these, but here we're once again just calling `unwrap`. Finally we hand of the connection to `handle_connection`.

## Parsing the Request

Our `handle_connection` function creates a new buffered reader to read the incoming bytes from the stream. We user our reader to read in the request, split it into lines, then collect lines into a vector until we reach an empty line.

As we've seen before, calling `collect` requires us to annotate the type of `http_request` so `collect` will know what kind of collection to return.

Once we have our request, we call into `send_response` to generate an appropriate response back to the client.

And that's all there is too it! Our server only runs in a single thread, so it can only handle a single request at a time. In the next section, we'll upgrade this server to run [in multiple threads](./ch20-02-multi-threaded-web-server.md).
