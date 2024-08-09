#define MAX_COMMAND_COUNT (256)


typedef enum COMMAND_TYPE {
	// ...
	COMMAND_TYPE_COUNT
} COMMAND_TYPE;

struct Command {
	int32 tmp;
};

struct Command_List {
	Command buffer[MAX_COMMAND_COUNT];
};
