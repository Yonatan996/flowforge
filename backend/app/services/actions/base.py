from abc import ABC, abstractmethod
from typing import Any, Dict


class ActionResult:
    def __init__(
        self,
        success: bool,
        output: Dict[str, Any],
        error: str = None,
        should_skip_subsequent: bool = False,
        retryable: bool = False
    ):
        self.success = success
        self.output = output
        self.error = error
        self.should_skip_subsequent = should_skip_subsequent
        self.retryable = retryable


class BaseAction(ABC):
    @abstractmethod
    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        """
        Executes the action with given configuration and runtime context.
        context typically contains:
          - 'input': execution input payload
          - 'steps': dict mapping step_key -> { 'output': ..., 'status': ... }
        """
        pass
