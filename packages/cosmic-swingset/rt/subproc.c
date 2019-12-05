#include <stdio.h>

#include <glib.h>

static void
child_watch_cb (GPid     pid,
                gint     status,
                gpointer user_data)
{
  g_message ("Child %" G_PID_FORMAT " exited %s", pid,
	     g_spawn_check_exit_status (status, NULL) ? "normally" : "abnormally");

  // Free any resources associated with the child here, such as I/O channels
  // on its stdout and stderr FDs. If you have no code to put in the
  // child_watch_cb() callback, you can remove it and the g_child_watch_add()
  // call, but you must also remove the G_SPAWN_DO_NOT_REAP_CHILD flag,
  // otherwise the child process will stay around as a zombie until this
  // process exits.

  g_spawn_close_pid (pid);
}

static gboolean
sub_readable (GIOChannel *source,
	      GIOCondition condition,
	      gpointer data) {
	gchar *str_return;
	gsize length;
	gsize terminator_pos;
	g_autoptr(GError) error = NULL;
	GIOStatus ok = g_io_channel_read_line (source,
					       &str_return,
					       &length,
					       &terminator_pos,
					       &error);
	printf("@@read: %d, %s\n", ok, str_return);  // use length
}

int
main(int argc, char **argv) {
	gchar * sub_argv[] = { "date", "-u", NULL };
	gint child_stdout, child_stderr;
	GPid child_pid;
	g_autoptr(GError) error = NULL;

	// Spawn child process.
	g_spawn_async_with_pipes (NULL /* working_directory */, sub_argv, NULL /* envp */,
				  G_SPAWN_DO_NOT_REAP_CHILD | G_SPAWN_SEARCH_PATH,
				  NULL /* child_setup */,
				  NULL /* user_data */, &child_pid, NULL /* stdin */, &child_stdout,
				  &child_stderr, &error);
	if (error != NULL) {
		g_error ("Spawning child failed: %s", error->message);
		return 1;
	}

	// Add a child watch function which will be called when the child process
	// exits.
	g_child_watch_add (child_pid, child_watch_cb, NULL);

	GIOChannel *out = g_io_channel_unix_new (child_stdout);
	guint w = g_io_add_watch (out, G_IO_IN,
				  sub_readable, NULL /*user_data*/);
	// You could watch for output on @child_stdout and @child_stderr using
	// #GUnixInputStream or #GIOChannel here.

	GMainLoop *ml = g_main_loop_new(NULL, FALSE);
	g_main_loop_run(ml);
}
